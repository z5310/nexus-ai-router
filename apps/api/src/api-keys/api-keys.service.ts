import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { createHash, randomBytes } from 'node:crypto'
import type { ApiKeyListResponse, ApiKeyRecord, CreateApiKeyResponse } from '@gateway/contracts'
import type { ApiKeyEntity } from '../database/entities/api-key.entity'
import { ApiKeysRepository } from './api-keys.repository'

@Injectable()
export class ApiKeysService {
  constructor(private readonly keys: ApiKeysRepository) {}

  async list(userId: string): Promise<ApiKeyListResponse> {
    return { data: (await this.keys.list(userId)).map((key) => this.map(key)) }
  }

  async create(userId: string, name: string): Promise<CreateApiKeyResponse> {
    if (await this.keys.countActive(userId) >= 20) throw new ConflictException('每个账户最多保留 20 个有效密钥')
    const secret = `nxs_live_${randomBytes(24).toString('base64url')}`
    const key = this.keys.create({
      userId,
      name: name.trim(),
      keyHash: createHash('sha256').update(secret).digest('hex'),
      keyPrefix: secret.slice(0, 12),
      lastFour: secret.slice(-4),
      lastUsedAt: null,
      revokedAt: null,
    })
    return { ...this.map(await this.keys.save(key)), key: secret }
  }

  async revoke(userId: string, id: string): Promise<void> {
    const key = await this.keys.findActive(id, userId)
    if (!key) throw new NotFoundException('API 密钥不存在或已撤销')
    key.revokedAt = new Date()
    await this.keys.save(key)
  }

  private map(key: ApiKeyEntity): ApiKeyRecord {
    return {
      id: key.id,
      name: key.name,
      maskedKey: `${key.keyPrefix}••••••••${key.lastFour}`,
      status: key.revokedAt ? 'revoked' : 'active',
      lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
      createdAt: key.createdAt.toISOString(),
    }
  }
}
