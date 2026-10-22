import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Repository } from 'typeorm'
import { ApiKeyEntity } from '../database/entities/api-key.entity'

@Injectable()
export class ApiKeysRepository {
  constructor(@InjectRepository(ApiKeyEntity) private readonly repository: Repository<ApiKeyEntity>) {}

  list(workspaceId: string): Promise<ApiKeyEntity[]> {
    return this.repository.find({ where: { workspaceId, revokedAt: IsNull() }, order: { createdAt: 'DESC' } })
  }

  findActive(id: string, workspaceId: string): Promise<ApiKeyEntity | null> {
    return this.repository.findOne({ where: { id, workspaceId, revokedAt: IsNull() } })
  }

  countActive(workspaceId: string): Promise<number> {
    return this.repository.count({ where: { workspaceId, revokedAt: IsNull() } })
  }

  create(input: Partial<ApiKeyEntity>): ApiKeyEntity { return this.repository.create(input) }
  save(key: ApiKeyEntity): Promise<ApiKeyEntity> { return this.repository.save(key) }
}
