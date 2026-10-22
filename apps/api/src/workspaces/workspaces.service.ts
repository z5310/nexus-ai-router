import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import type { WorkspaceContext, WorkspaceListResponse } from '@gateway/contracts'
import { DataSource, Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { ProjectEntity } from '../database/entities/project.entity'
import { WorkspaceMemberEntity } from '../database/entities/workspace-member.entity'
import { WorkspaceEntity } from '../database/entities/workspace.entity'

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
