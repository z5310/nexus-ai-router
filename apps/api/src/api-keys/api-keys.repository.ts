import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, IsNull, Repository } from 'typeorm'
import { ApiKeyEntity } from '../database/entities/api-key.entity'
import { WorkspaceEntity } from '../database/entities/workspace.entity'
import { WorkspaceMemberEntity } from '../database/entities/workspace-member.entity'

export type ApiKeyCreationResult =
  | { status: 'created'; key: ApiKeyEntity }
  | { status: 'workspace-unavailable' }
  | { status: 'membership-denied' }
  | { status: 'limit-reached' }

@Injectable()
export class ApiKeysRepository {
  constructor(
    @InjectRepository(ApiKeyEntity) private readonly repository: Repository<ApiKeyEntity>,
    private readonly dataSource: DataSource,
  ) {}

  list(workspaceId: string): Promise<ApiKeyEntity[]> {
    return this.repository.find({ where: { workspaceId, revokedAt: IsNull() }, order: { createdAt: 'DESC' } })
  }

  findActive(id: string, workspaceId: string): Promise<ApiKeyEntity | null> {
    return this.repository.findOne({ where: { id, workspaceId, revokedAt: IsNull() } })
  }

  createForAuthorizedMember(workspaceId: string, userId: string, input: Partial<ApiKeyEntity>): Promise<ApiKeyCreationResult> {
    return this.dataSource.transaction(async (manager) => {
      const workspace = await manager.getRepository(WorkspaceEntity).findOne({
        where: { id: workspaceId, status: 'active' },
        lock: { mode: 'pessimistic_write' },
      })
      if (!workspace) return { status: 'workspace-unavailable' }

      const member = await manager.getRepository(WorkspaceMemberEntity).findOneBy({
        workspaceId,
        userId,
        status: 'active',
      })
      if (!member || !['owner', 'admin', 'developer'].includes(member.role)) return { status: 'membership-denied' }

      const keys = manager.getRepository(ApiKeyEntity)
      if (await keys.count({ where: { workspaceId, revokedAt: IsNull() } }) >= 20) return { status: 'limit-reached' }
      return { status: 'created', key: await keys.save(keys.create(input)) }
    })
  }

  save(key: ApiKeyEntity): Promise<ApiKeyEntity> { return this.repository.save(key) }
}
