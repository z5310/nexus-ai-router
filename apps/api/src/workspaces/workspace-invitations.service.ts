import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type {
  AcceptWorkspaceInvitationResponse,
  CreateWorkspaceInvitationInput,
  WorkspaceInvitation,
  WorkspaceInvitationListResponse,
  WorkspaceInvitationSecret,
} from '@gateway/contracts'
import { createHash, randomBytes } from 'node:crypto'
import { DataSource, LessThanOrEqual, Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { UserEntity } from '../database/entities/user.entity'
import { WorkspaceEntity } from '../database/entities/workspace.entity'
import { WorkspaceInvitationEntity } from '../database/entities/workspace-invitation.entity'
import { WorkspaceMemberEntity } from '../database/entities/workspace-member.entity'
import { WorkspacesService } from './workspaces.service'

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1_000
const MAX_PENDING_INVITATIONS = 100

@Injectable()
export class WorkspaceInvitationsService {
  constructor(
    @InjectRepository(WorkspaceInvitationEntity) private readonly invitations: Repository<WorkspaceInvitationEntity>,
    private readonly dataSource: DataSource,
    private readonly workspaces: WorkspacesService,
  ) {}

  async list(workspaceId: string): Promise<WorkspaceInvitationListResponse> {
    await this.invitations.update({ workspaceId, status: 'pending', expiresAt: LessThanOrEqual(new Date()) }, { status: 'expired' })
    const rows = await this.invitations.find({ where: { workspaceId }, order: { createdAt: 'DESC', id: 'DESC' }, take: 200 })
    return { data: rows.map((row) => this.map(row)) }
  }

  async create(actorId: string, workspaceId: string, input: CreateWorkspaceInvitationInput): Promise<WorkspaceInvitationSecret> {
    const email = this.normalizeEmail(input.email)
    const secret = this.secret()
    const row = await this.dataSource.transaction(async (manager) => {
      const actor = await this.lockAndAuthorize(manager, actorId, workspaceId)
      if (actor.role === 'admin' && input.role === 'admin') throw new ForbiddenException('仅工作区所有者可邀请管理员')
      const invitations = manager.getRepository(WorkspaceInvitationEntity)
      const users = manager.getRepository(UserEntity)
      const members = manager.getRepository(WorkspaceMemberEntity)
      const user = await users.findOne({ where: { email } })
      if (user && await members.findOne({ where: { workspaceId, userId: user.id, status: 'active' } })) {
        throw new ConflictException('该用户已经是工作区成员')
      }
      const existing = await invitations.findOne({ where: { workspaceId, email, status: 'pending' }, lock: { mode: 'pessimistic_write' } })
      if (existing && existing.expiresAt > new Date()) throw new ConflictException('该邮箱已有待接受邀请')
      if (existing) await invitations.update(existing.id, { status: 'expired' })
      const pendingCount = await invitations.count({ where: { workspaceId, status: 'pending' } })
      if (pendingCount >= MAX_PENDING_INVITATIONS) throw new BadRequestException(`每个工作区最多保留 ${MAX_PENDING_INVITATIONS} 个待接受邀请`)
      const now = new Date()
      return invitations.save(invitations.create({
        workspaceId,
        email,
        role: input.role,
        tokenHash: this.hash(secret),
        status: 'pending',
        invitedByUserId: actorId,
        acceptedByUserId: null,
        expiresAt: new Date(now.getTime() + INVITATION_TTL_MS),
        acceptedAt: null,
        revokedAt: null,
        lastSentAt: now,
      }))
    })
    return { ...this.map(row), token: secret }
  }

  async resend(actorId: string, workspaceId: string, invitationId: string): Promise<WorkspaceInvitationSecret> {
    const secret = this.secret()
    const row = await this.dataSource.transaction(async (manager) => {
      const actor = await this.lockAndAuthorize(manager, actorId, workspaceId)
      const invitations = manager.getRepository(WorkspaceInvitationEntity)
      const invitation = await invitations.findOne({ where: { id: invitationId, workspaceId }, lock: { mode: 'pessimistic_write' } })
      if (!invitation) throw new NotFoundException('邀请不存在')
      if (!['pending', 'expired'].includes(invitation.status)) throw new ConflictException('该邀请不能重新发送')
      if (actor.role === 'admin' && invitation.role === 'admin') throw new ForbiddenException('仅工作区所有者可邀请管理员')
      const user = await manager.getRepository(UserEntity).findOne({ where: { email: invitation.email } })
      if (user && await manager.getRepository(WorkspaceMemberEntity).findOne({ where: { workspaceId, userId: user.id, status: 'active' } })) {
        throw new ConflictException('该用户已经是工作区成员')
      }
      const now = new Date()
      invitation.tokenHash = this.hash(secret)
      invitation.status = 'pending'
      invitation.expiresAt = new Date(now.getTime() + INVITATION_TTL_MS)
      invitation.lastSentAt = now
      invitation.revokedAt = null
      return invitations.save(invitation)
    })
    return { ...this.map(row), token: secret }
  }

  async revoke(actorId: string, workspaceId: string, invitationId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.lockAndAuthorize(manager, actorId, workspaceId)
      const invitations = manager.getRepository(WorkspaceInvitationEntity)
      const invitation = await invitations.findOne({ where: { id: invitationId, workspaceId }, lock: { mode: 'pessimistic_write' } })
      if (!invitation) throw new NotFoundException('邀请不存在')
      if (!['pending', 'expired'].includes(invitation.status)) throw new ConflictException('该邀请不能撤销')
      invitation.status = 'revoked'
      invitation.revokedAt = new Date()
      await invitations.save(invitation)
    })
  }

  async accept(userId: string, userEmail: string, token: string): Promise<AcceptWorkspaceInvitationResponse> {
    if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) throw new NotFoundException('邀请无效')
    const result = await this.dataSource.transaction(async (manager) => {
      const invitations = manager.getRepository(WorkspaceInvitationEntity)
      const invitation = await invitations.findOne({ where: { tokenHash: this.hash(token) }, lock: { mode: 'pessimistic_write' } })
      if (!invitation) throw new NotFoundException('邀请无效')
      if (invitation.status !== 'pending') throw new ConflictException('邀请已被使用或撤销')
      if (invitation.expiresAt <= new Date()) {
        invitation.status = 'expired'
        await invitations.save(invitation)
        return { expired: true as const, workspaceId: invitation.workspaceId }
      }
      if (invitation.email !== this.normalizeEmail(userEmail)) throw new ForbiddenException('请使用邀请指定的邮箱登录')
      const workspace = await manager.getRepository(WorkspaceEntity).findOne({ where: { id: invitation.workspaceId, status: 'active' }, lock: { mode: 'pessimistic_write' } })
      if (!workspace) throw new NotFoundException('工作区不可用')
      const members = manager.getRepository(WorkspaceMemberEntity)
      const membership = await members.findOne({ where: { workspaceId: invitation.workspaceId, userId }, lock: { mode: 'pessimistic_write' } })
      if (membership?.status === 'active') throw new ConflictException('你已经是该工作区成员')
      if (membership) {
        membership.role = invitation.role
        membership.status = 'active'
        await members.save(membership)
      } else {
        await members.save(members.create({ workspaceId: invitation.workspaceId, userId, role: invitation.role, status: 'active' }))
      }
      invitation.status = 'accepted'
      invitation.acceptedByUserId = userId
      invitation.acceptedAt = new Date()
      await invitations.save(invitation)
      return { expired: false as const, workspaceId: invitation.workspaceId }
    })
    if (result.expired) throw new BadRequestException('邀请已过期，请联系工作区管理员重新发送')
    return { workspace: await this.workspaces.resolve(userId, result.workspaceId) }
  }

  private async lockAndAuthorize(manager: DataSource['manager'], actorId: string, workspaceId: string): Promise<WorkspaceMemberEntity> {
    const workspace = await manager.getRepository(WorkspaceEntity).findOne({ where: { id: workspaceId, status: 'active' }, lock: { mode: 'pessimistic_write' } })
    if (!workspace) throw new ForbiddenException('工作区不可用')
    const actor = await manager.getRepository(WorkspaceMemberEntity).findOneBy({ workspaceId, userId: actorId, status: 'active' })
    if (!actor || !['owner', 'admin'].includes(actor.role)) throw new ForbiddenException('无权管理邀请')
    return actor
  }

  private normalizeEmail(email: string): string { return email.trim().toLowerCase() }
  private secret(): string { return randomBytes(32).toString('base64url') }
  private hash(token: string): string { return createHash('sha256').update(token).digest('hex') }

  private map(row: WorkspaceInvitationEntity): WorkspaceInvitation {
    const status = row.status === 'pending' && row.expiresAt <= new Date() ? 'expired' : row.status
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      email: row.email,
      role: row.role,
      status,
      invitedByUserId: row.invitedByUserId,
      acceptedByUserId: row.acceptedByUserId,
      expiresAt: row.expiresAt.toISOString(),
      acceptedAt: row.acceptedAt?.toISOString() ?? null,
      revokedAt: row.revokedAt?.toISOString() ?? null,
      lastSentAt: row.lastSentAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    }
  }
}
