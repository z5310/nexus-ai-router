import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import type { OpenAIChatCompletionResponse } from '@gateway/contracts'
import { createHash } from 'node:crypto'
import { DataSource } from 'typeorm'

interface IdempotencyRow {
  request_hash: string
  request_id: string
  status: 'pending' | 'completed' | 'failed'
  response: OpenAIChatCompletionResponse | null
}

export interface IdempotentResult {
  response: OpenAIChatCompletionResponse
  requestId: string
  replayed: boolean
}

@Injectable()
export class InferenceIdempotencyService {
  constructor(private readonly source: DataSource) {}

  async execute(
    workspaceId: string,
    rawKey: string,
    payload: unknown,
    requestId: string,
    dispatch: (requestId: string) => Promise<OpenAIChatCompletionResponse>,
  ): Promise<IdempotentResult> {
    const key = this.validateKey(rawKey)
    const keyHash = this.hash(key)
    const requestHash = this.hash(this.canonical(payload))
    await this.source.query(`
      DELETE FROM inference_idempotency
      WHERE id IN (
        SELECT id FROM inference_idempotency
        WHERE expires_at <= now()
        ORDER BY expires_at
        LIMIT 100
        FOR UPDATE SKIP LOCKED
      )
    `)
    const [inserted] = await this.source.query(`
      INSERT INTO inference_idempotency (workspace_id, key_hash, request_hash, request_id, expires_at)
      VALUES ($1, $2, $3, $4, now() + interval '24 hours')
      ON CONFLICT (workspace_id, key_hash) DO UPDATE SET
        request_hash = EXCLUDED.request_hash,
        request_id = EXCLUDED.request_id,
        status = 'pending',
        response = NULL,
        expires_at = EXCLUDED.expires_at,
        updated_at = now()
      WHERE inference_idempotency.expires_at <= now()
      RETURNING request_id
    `, [workspaceId, keyHash, requestHash, requestId])

    if (!inserted) return this.replay(workspaceId, keyHash, requestHash)

    try {
      const response = await dispatch(requestId)
      await this.source.query(`
        UPDATE inference_idempotency SET status = 'completed', response = $4::jsonb, updated_at = now()
        WHERE workspace_id = $1 AND key_hash = $2 AND request_hash = $3 AND status = 'pending'
      `, [workspaceId, keyHash, requestHash, JSON.stringify(response)])
      return { response, requestId, replayed: false }
    } catch (error) {
      await this.source.query(`
        UPDATE inference_idempotency SET status = 'failed', updated_at = now()
        WHERE workspace_id = $1 AND key_hash = $2 AND request_hash = $3 AND status = 'pending'
      `, [workspaceId, keyHash, requestHash])
      throw error
    }
  }

  private async replay(workspaceId: string, keyHash: string, requestHash: string): Promise<IdempotentResult> {
    const [row] = await this.source.query<IdempotencyRow[]>(`
      SELECT request_hash, request_id, status, response
      FROM inference_idempotency WHERE workspace_id = $1 AND key_hash = $2
    `, [workspaceId, keyHash])
    if (!row) throw new ConflictException('幂等请求状态不可用，请使用新的 Idempotency-Key')
    if (row.request_hash !== requestHash) throw new ConflictException('Idempotency-Key 已用于不同请求')
    if (row.status === 'pending') throw new ConflictException(`相同请求正在处理中，请稍后查询；request_id=${row.request_id}`)
    if (row.status === 'failed') throw new ConflictException(`相同请求此前结果不确定，为避免重复调用未自动重试；request_id=${row.request_id}`)
    if (!row.response) throw new ConflictException('幂等响应不可用，请联系管理员')
    return { response: row.response, requestId: row.request_id, replayed: true }
  }

  private validateKey(value: string): string {
    const key = value.trim()
    if (key.length < 8 || key.length > 128 || !/^[\x21-\x7E]+$/.test(key)) {
      throw new BadRequestException('Idempotency-Key 必须是 8–128 位可见 ASCII 字符')
    }
    return key
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }

  private canonical(value: unknown): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
    if (Array.isArray(value)) return `[${value.map((item) => this.canonical(item)).join(',')}]`
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${this.canonical(item)}`).join(',')}}`
  }
}
