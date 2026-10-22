import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, MoreThan, Repository } from 'typeorm'
import { AuthSessionEntity } from '../database/entities/auth-session.entity'

export interface SessionMetadata {
  userAgent?: string
  ipAddress?: string
}

@Injectable()
export class SessionsRepository {
  constructor(@InjectRepository(AuthSessionEntity) private readonly repository: Repository<AuthSessionEntity>) {}

  create(userId: string, tokenHash: string, expiresAt: Date, metadata: SessionMetadata): Promise<AuthSessionEntity> {
    return this.repository.save(this.repository.create({
      userId,
      tokenHash,
      expiresAt,
      userAgent: metadata.userAgent?.slice(0, 500) || null,
      ipAddress: metadata.ipAddress?.slice(0, 64) || null,
      lastSeenAt: new Date(),
    }))
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

  listActive(userId: string): Promise<AuthSessionEntity[]> {
    return this.repository.find({
      where: { userId, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      order: { lastSeenAt: 'DESC' },
    })
  }

  async revokeById(userId: string, id: string): Promise<boolean> {
    const result = await this.repository.update({ id, userId, revokedAt: IsNull() }, { revokedAt: new Date() })
    return (result.affected ?? 0) > 0
  }

  async revokeAll(userId: string): Promise<void> {
    await this.repository.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() })
  }
}
