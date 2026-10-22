import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, MoreThan, Repository } from 'typeorm'
import { AuthActionTokenEntity, type AuthActionPurpose } from '../database/entities/auth-action-token.entity'

@Injectable()
export class ActionTokensRepository {
  constructor(@InjectRepository(AuthActionTokenEntity) private readonly repository: Repository<AuthActionTokenEntity>) {}

  create(userId: string, purpose: AuthActionPurpose, tokenHash: string, expiresAt: Date): Promise<AuthActionTokenEntity> {
    return this.repository.save(this.repository.create({ userId, purpose, tokenHash, expiresAt }))
  }

  findActive(tokenHash: string, purpose: AuthActionPurpose): Promise<AuthActionTokenEntity | null> {
    return this.repository.findOne({
      where: { tokenHash, purpose, usedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      relations: { user: true },
    })
  }

  async invalidate(userId: string, purpose: AuthActionPurpose): Promise<void> {
    await this.repository.update({ userId, purpose, usedAt: IsNull() }, { usedAt: new Date() })
  }

  async consume(id: string): Promise<void> {
    await this.repository.update({ id, usedAt: IsNull() }, { usedAt: new Date() })
  }
}
