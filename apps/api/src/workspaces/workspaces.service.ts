import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { ApiKeyEntity } from '../database/entities/api-key.entity'
import type { UpdateWorkspaceMemberInput } from '@gateway/contracts'
import type { TransferWorkspaceOwnershipResponse, WorkspaceContext, WorkspaceListResponse, WorkspaceMemberListResponse } from '@gateway/contracts'
import { UserEntity } from '../database/entities/user.entity'
import { DataSource, IsNull, Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { ProjectEntity } from '../database/entities/project.entity'
import { WorkspaceMemberEntity } from '../database/entities/workspace-member.entity'
import { WorkspaceEntity } from '../database/entities/workspace.entity'
import type { UpdateWorkspaceDto } from './update-workspace.dto'
import type { UpdateIpPolicyDto } from './update-ip-policy.dto'
import { parseNetwork } from './ip-policy'
import { hasWorkspacePermissions } from './workspace-permissions'

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(WorkspaceEntity) private readonly workspaces: Repository<WorkspaceEntity>,
    @InjectRepository(WorkspaceMemberEntity) private readonly members: Repository<WorkspaceMemberEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async ensureDefaultForUser(userId: string, name: string, email: string): Promise<WorkspaceContext> {
    const existing = await this.findMembership(userId)
    if (existing) return this.map(existing)

    try {
      await this.dataSource.transaction(async (manager) => {
        const memberRepository = manager.getRepository(WorkspaceMemberEntity)
        if (await memberRepository.findOne({ where: { userId, status: 'active' } })) return

        const baseSlug = this.slugify(email.split('@')[0] || name || 'workspace')
        const workspace = await manager.getRepository(WorkspaceEntity).save(manager.getRepository(WorkspaceEntity).create({
          name: this.workspaceName(name),
          slug: `${baseSlug}-${userId.slice(0, 8)}`,
          defaultCurrency: 'CNY',
          status: 'active',
          createdByUserId: userId,
        }))
        await memberRepository.save(memberRepository.create({ workspaceId: workspace.id, userId, role: 'owner', status: 'active' }))
        await manager.getRepository(ProjectEntity).save(manager.getRepository(ProjectEntity).create({
          workspaceId: workspace.id,
          name: 'Default Project',
          slug: 'default',
          status: 'active',
        }))
      })
    } catch (error) {
      if (!(await this.findMembership(userId))) throw error
    }

    return this.resolve(userId)
  }

  async list(userId: string): Promise<WorkspaceListResponse> {
    const memberships = await this.members.find({
      where: { userId, status: 'active' },
      relations: { workspace: true },
      order: { createdAt: 'ASC' },
    })
    return { data: memberships.filter((item) => item.workspace.status === 'active').map((item) => this.map(item)) }
  }

  async listMembers(workspaceId: string): Promise<WorkspaceMemberListResponse> {
    const data = await this.members.createQueryBuilder('member')
      .innerJoin(UserEntity, 'user', 'user.id = member.user_id')
      .select('member.id', 'id')
      .addSelect('user.name', 'name')
      .addSelect('user.email', 'email')
      .addSelect('member.role', 'role')
      .addSelect('member.status', 'status')
      .where('member.workspace_id = :workspaceId', { workspaceId })
      .orderBy('member.created_at', 'ASC')
      .addOrderBy('member.id', 'ASC')
      .getRawMany<WorkspaceMemberListResponse['data'][number]>()
    return { data }
  }

  async manageMember(actorId: string, workspaceId: string, memberId: string, role: UpdateWorkspaceMemberInput['role'] | null): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const workspace = await manager.getRepository(WorkspaceEntity).findOne({ where: { id: workspaceId, status: 'active' }, lock: { mode: 'pessimistic_write' } })
      if (!workspace) throw new ForbiddenException('工作区不可用')
      const members = manager.getRepository(WorkspaceMemberEntity)
      const actor = await members.findOneBy({ workspaceId, userId: actorId, status: 'active' })
      if (!actor || !['owner', 'admin'].includes(actor.role)) throw new ForbiddenException('无权管理成员')
      const target = await members.findOneBy({ id: memberId, workspaceId })
      if (!target) throw new NotFoundException('成员不存在')
      if (target.role === 'owner' || target.userId === actorId) throw new ForbiddenException('不能通过此操作变更所有者或自身权限')
      if (actor.role === 'admin' && (target.role === 'admin' || role === 'admin')) throw new ForbiddenException('仅所有者可管理管理员')
      if (role) {
        if (!hasWorkspacePermissions(role, ['keys:manage'])) {
          await manager.getRepository(ApiKeyEntity).update(
            { workspaceId, userId: target.userId, revokedAt: IsNull() },
            { revokedAt: new Date() },
          )
        }
        await members.update(target.id, { role })
      } else {
        await manager.getRepository(ApiKeyEntity).update({ workspaceId, userId: target.userId, revokedAt: IsNull() }, { revokedAt: new Date() })
        await members.delete(target.id)
      }
    })
  }

  async transferOwnership(actorId: string, workspaceId: string, targetMemberId: string): Promise<TransferWorkspaceOwnershipResponse> {
    return this.dataSource.transaction(async (manager) => {
      const workspace = await manager.getRepository(WorkspaceEntity).findOne({ where: { id: workspaceId, status: 'active' }, lock: { mode: 'pessimistic_write' } })
      if (!workspace) throw new ForbiddenException('工作区不可用')
      const members = manager.getRepository(WorkspaceMemberEntity)
      const actor = await members.findOne({ where: { workspaceId, userId: actorId, status: 'active' }, lock: { mode: 'pessimistic_write' } })
      if (!actor || actor.role !== 'owner') throw new ForbiddenException('仅工作区所有者可转移所有权')
      const target = await members.findOne({ where: { id: targetMemberId, workspaceId, status: 'active' }, lock: { mode: 'pessimistic_write' } })
      if (!target) throw new NotFoundException('目标成员不存在')
      if (target.id === actor.id) throw new BadRequestException('目标成员不能是当前所有者')
      await members.update(actor.id, { role: 'admin' })
      await members.update(target.id, { role: 'owner' })
      return { workspaceId, previousOwnerMemberId: actor.id, ownerMemberId: target.id }
    })
  }

  async ipPolicy(workspaceId: string) {
    const workspace = await this.workspaces.findOneByOrFail({ id: workspaceId })
    return { enabled: workspace.ipAllowlistEnabled, networks: workspace.ipAllowlist }
  }

  async updateIpPolicy(userId: string, workspaceId: string, input: UpdateIpPolicyDto) {
    const context = await this.resolve(userId, workspaceId)
    if (!['owner', 'admin'].includes(context.role)) throw new ForbiddenException('仅所有者或管理员可修改 IP 规则')
    const networks = [...new Set(input.networks.map((value) => value.trim()))]
    try { networks.forEach(parseNetwork) } catch { throw new BadRequestException('请输入有效的 IPv4、IPv6 或 CIDR 网段') }
    if (input.enabled && !networks.length) throw new BadRequestException('启用时至少填写一个允许的 IP 或网段')
    await this.workspaces.update(workspaceId, { ipAllowlistEnabled: input.enabled, ipAllowlist: networks })
    return { enabled: input.enabled, networks }
  }

  async updateSettings(userId: string, workspaceId: string, input: UpdateWorkspaceDto): Promise<WorkspaceContext> {
    const context = await this.resolve(userId, workspaceId)
    if (context.role !== 'owner' && context.role !== 'admin') throw new ForbiddenException('仅工作区所有者或管理员可修改设置')
    await this.workspaces.update(workspaceId, { name: input.name, defaultCurrency: input.defaultCurrency })
    return { ...context, name: input.name, defaultCurrency: input.defaultCurrency }
  }

  async resolve(userId: string, requestedWorkspaceId?: string): Promise<WorkspaceContext> {
    if (requestedWorkspaceId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedWorkspaceId)) {
      throw new BadRequestException('工作区标识格式无效')
    }
    const membership = await this.findMembership(userId, requestedWorkspaceId)
    if (!membership || membership.workspace.status !== 'active') throw new ForbiddenException('无权访问该工作区')
    return this.map(membership)
  }

  private findMembership(userId: string, workspaceId?: string): Promise<WorkspaceMemberEntity | null> {
    return this.members.findOne({
      where: { userId, status: 'active', ...(workspaceId ? { workspaceId } : {}) },
      relations: { workspace: true },
      order: { createdAt: 'ASC' },
    })
  }

  private map(membership: WorkspaceMemberEntity): WorkspaceContext {
    return {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      role: membership.role,
      defaultCurrency: membership.workspace.defaultCurrency,
    }
  }

  private slugify(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'workspace'
  }

  private workspaceName(value: string): string {
    const name = value.trim()
    if (!name) return 'Nexus 工作区'
    return name.endsWith('工作区') ? name : `${name} 的工作区`
  }
}
