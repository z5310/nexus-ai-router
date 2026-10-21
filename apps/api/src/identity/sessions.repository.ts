import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, MoreThan, Repository } from 'typeorm'
import { AuthSessionEntity } from '../database/entities/auth-session.entity'

@Injectable()
export class SessionsRepository {
  constructor(@InjectRepository(AuthSessionEntity) private readonly repository: Repository<AuthSessionEntity>) {}

  create(userId: string, tokenHash: string, expiresAt: Date): Promise<AuthSessionEntity> {
    return this.repository.save(this.repository.create({ userId, tokenHash, expiresAt }))
  }

  findActive(tokenHash: string): Promise<AuthSessionEntity | null> {
    return this.repository.findOne({
      where: { tokenHash, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      relations: { user: true },
    })
  }

  async revoke(tokenHash: string): Promise<void> {
    await this.repository.update({ tokenHash, revokedAt: IsNull() }, { revokedAt: new Date() })
  }
}
