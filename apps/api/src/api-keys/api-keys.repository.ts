import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Repository } from 'typeorm'
import { ApiKeyEntity } from '../database/entities/api-key.entity'

@Injectable()
export class ApiKeysRepository {
  constructor(@InjectRepository(ApiKeyEntity) private readonly repository: Repository<ApiKeyEntity>) {}

  list(userId: string): Promise<ApiKeyEntity[]> {
    return this.repository.find({ where: { userId, revokedAt: IsNull() }, order: { createdAt: 'DESC' } })
  }

  findActive(id: string, userId: string): Promise<ApiKeyEntity | null> {
    return this.repository.findOne({ where: { id, userId, revokedAt: IsNull() } })
  }

  countActive(userId: string): Promise<number> {
    return this.repository.count({ where: { userId, revokedAt: IsNull() } })
  }

  create(input: Partial<ApiKeyEntity>): ApiKeyEntity { return this.repository.create(input) }
  save(key: ApiKeyEntity): Promise<ApiKeyEntity> { return this.repository.save(key) }
}
