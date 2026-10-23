import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, MoreThan, Repository } from 'typeorm'
import { randomUUID } from 'node:crypto'
import { UserEntity } from '../database/entities/user.entity'
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
      familyId: randomUUID(),
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

  findActiveById(id: string, userId: string): Promise<AuthSessionEntity | null> {
    return this.repository.findOne({
      where: { id, userId, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      relations: { user: true },
    })
  }

  async rotate(tokenHash: string, nextHash: string, metadata: SessionMetadata): Promise<AuthSessionEntity | null> {
    return this.repository.manager.transaction(async (manager) => {
      const sessions = manager.getRepository(AuthSessionEntity)
      const candidate = await sessions.findOneBy({ tokenHash })
      if (!candidate) return null
      // All rotations for one account serialize before reading current token state.
      const user = await manager.getRepository(UserEntity).findOne({
        where: { id: candidate.userId }, lock: { mode: 'pessimistic_write' },
      })
      if (!user || user.status !== 'active') return null
      const session = await sessions.findOneBy({ id: candidate.id })
      if (!session || session.expiresAt.getTime() <= Date.now()) return null
      if (session.revokedAt) {
        if (session.rotatedAt) {
          await sessions.update({ familyId: session.familyId, revokedAt: IsNull() }, { revokedAt: new Date() })
        }
        // Return rather than throw so replay revocation commits.
        return null
      }
      const now = new Date()
      await sessions.update(session.id, { revokedAt: now, rotatedAt: now })
      const next = await sessions.save(sessions.create({
        userId: session.userId,
        familyId: session.familyId,
        tokenHash: nextHash,
        expiresAt: session.expiresAt,
        lastSeenAt: now,
        userAgent: metadata.userAgent?.slice(0, 500) || session.userAgent,
        ipAddress: metadata.ipAddress?.slice(0, 64) || session.ipAddress,
      }))
      next.user = user
      return next
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
