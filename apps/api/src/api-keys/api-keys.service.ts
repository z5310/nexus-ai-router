import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { createHash, randomBytes } from 'node:crypto'
import type { ApiKeyListResponse, ApiKeyRecord, CreateApiKeyResponse } from '@gateway/contracts'
import type { ApiKeyEntity } from '../database/entities/api-key.entity'
import { ApiKeysRepository } from './api-keys.repository'

@Injectable()
export class ApiKeysService {
  constructor(private readonly keys: ApiKeysRepository) {}

  async list(workspaceId: string): Promise<ApiKeyListResponse> {
    return { data: (await this.keys.list(workspaceId)).map((key) => this.map(key)) }
  }

  async create(workspaceId: string, actorUserId: string, name: string): Promise<CreateApiKeyResponse> {
    const secret = `nxs_live_${randomBytes(24).toString('base64url')}`
    const result = await this.keys.createForAuthorizedMember(workspaceId, actorUserId, {
      userId: actorUserId,
      workspaceId,
      name: name.trim(),
      keyHash: createHash('sha256').update(secret).digest('hex'),
      keyPrefix: secret.slice(0, 12),
      lastFour: secret.slice(-4),
      lastUsedAt: null,
      revokedAt: null,
    })
    if (result.status === 'limit-reached') throw new ConflictException('每个工作区最多保留 20 个有效密钥')
    if (result.status === 'workspace-unavailable') throw new ForbiddenException('工作区不可用')
    if (result.status === 'membership-denied') throw new ForbiddenException('当前成员无权创建 API 密钥')
    return { ...this.map(result.key), key: secret }
  }

  async revoke(workspaceId: string, id: string): Promise<void> {
    const key = await this.keys.findActive(id, workspaceId)
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
