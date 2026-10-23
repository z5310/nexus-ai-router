import { ConflictException, HttpException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import type { BillingPendingListResponse, OpenAIChatCompletionRequest, RequestPriceSnapshot } from '@gateway/contracts'
import { BillingService } from './billing.service'
import { fromMicros } from './money'
import { chatSnapshotMicros } from '../inference/price-snapshot'

export interface ChatBillingAttempt {
  workspaceId: string
  reference: string
  maxTokens: number
  price: RequestPriceSnapshot
}

type Usage = { prompt_tokens: number; completion_tokens: number }

@Injectable()
export class ChatBillingService {
  private readonly logger = new Logger(ChatBillingService.name)
  constructor(private readonly source: DataSource, private readonly billing: BillingService, private readonly config: ConfigService) {}

  enabled(workspaceId: string): boolean {
    return this.config.get<string>('BILLING_PREPAID_WORKSPACE_IDS', '').split(',').map((id) => id.trim().toLowerCase()).includes(workspaceId.toLowerCase())
  }

  async begin(workspaceId: string, requestId: string, attempt: number, price: RequestPriceSnapshot, input: OpenAIChatCompletionRequest): Promise<ChatBillingAttempt | undefined> {
    if (!this.enabled(workspaceId)) return undefined
    if (!/^[A-Za-z0-9_.:-]{1,80}$/.test(requestId)) throw new ConflictException('计费请求标识无效')
    const maxTokens = input.max_tokens ?? 2048
    // A conservative estimate, not a tokenizer guarantee. Excess actual usage is reconciled.
    const inputBudget = input.messages.reduce((sum, message) => sum + Buffer.byteLength(message.content, 'utf8') + 32, 256)
    const amount = fromMicros(chatSnapshotMicros(inputBudget, maxTokens, price))
    const reference = `${requestId}:${attempt}`
    await this.billing.reserve(workspaceId, reference, amount, { parentRequestId: requestId, priceSnapshot: price })
    const [dispatched] = await this.source.query(`WITH changed AS (
      UPDATE billing_reservations SET outcome = 'dispatched', updated_at = now()
      WHERE workspace_id = $1 AND request_id = $2 AND status = 'held' AND outcome = 'prepared' RETURNING request_id
    ) SELECT * FROM changed`, [workspaceId, reference])
    if (!dispatched) throw new ConflictException('模型调用尝试已被处理')
    return { workspaceId, reference, maxTokens, price }
  }

  /** Persist the outcome before touching funds. Recovery can replay a known outcome safely. */
  async finish(attempt: ChatBillingAttempt | undefined, completed: boolean, usage?: Usage, notDispatched = false): Promise<void> {
    if (!attempt) return
    try {
      const known = completed && usage && [usage.prompt_tokens, usage.completion_tokens].every((value) => Number.isSafeInteger(value) && value >= 0)
      const outcome = known ? 'settle' : notDispatched ? 'release' : 'review'
      const actual = known ? String(chatSnapshotMicros(usage.prompt_tokens, usage.completion_tokens, attempt.price)) : null
      const reason = outcome === 'review' ? 'upstream_usage_unknown' : null
      const [changed] = await this.source.query(`WITH changed AS (
        UPDATE billing_reservations SET outcome = $3, actual_micros = $4, input_tokens = $5, output_tokens = $6,
          review_reason = $7, updated_at = now()
        WHERE workspace_id = $1 AND request_id = $2 AND status = 'held' AND outcome = 'dispatched' RETURNING request_id
      ) SELECT * FROM changed`, [attempt.workspaceId, attempt.reference, outcome, actual,
        known ? usage.prompt_tokens : null, known ? usage.completion_tokens : null, reason])
      if (!changed) return // Another terminal path/reconciler already won; never change its evidence.
      if (outcome === 'settle') await this.billing.settle(attempt.workspaceId, attempt.reference, fromMicros(actual!))
      if (outcome === 'release') await this.billing.release(attempt.workspaceId, attempt.reference)
    } catch (error) {
      // Held funds and a durable outcome survive. Returning model output does not imply settlement.
      this.logger.warn(`模型计费等待对账 ${attempt.reference}: ${error instanceof Error ? error.message : 'unknown error'}`)
    }
  }

  async pending(workspaceId: string): Promise<BillingPendingListResponse> {
    const rows = await this.source.query(`SELECT request_id, parent_request_id, amount_micros, actual_micros, outcome, review_reason, updated_at
      FROM billing_reservations WHERE workspace_id = $1 AND status = 'held' AND parent_request_id IS NOT NULL
      ORDER BY created_at ASC LIMIT 50`, [workspaceId])
    return { data: rows.map((row: { request_id: string; parent_request_id: string; amount_micros: string; actual_micros: string | null; outcome: BillingPendingListResponse['data'][number]['outcome']; review_reason: string | null; updated_at: Date }) => ({
      reference: row.request_id, requestId: row.parent_request_id, reserved: fromMicros(row.amount_micros),
      actual: row.actual_micros === null ? null : fromMicros(row.actual_micros), outcome: row.outcome,
      reviewReason: row.review_reason, updatedAt: row.updated_at.toISOString(),
    })) }
  }

  async reconcile(): Promise<void> {
    // Unsent stale work can be released. Dispatched stale work must retain its hold for review.
    await this.source.query(`UPDATE billing_reservations SET
      outcome = CASE WHEN outcome = 'prepared' THEN 'release' ELSE 'review' END,
      review_reason = CASE WHEN outcome = 'dispatched' THEN 'process_outcome_unknown' ELSE NULL END, updated_at = now()
      WHERE (workspace_id, request_id) IN (SELECT workspace_id, request_id FROM billing_reservations
        WHERE status = 'held' AND outcome IN ('prepared','dispatched') AND updated_at < now() - interval '15 minutes'
        ORDER BY updated_at LIMIT 50 FOR UPDATE SKIP LOCKED)`)
    const rows = await this.source.query(`SELECT workspace_id, request_id, actual_micros, outcome FROM billing_reservations
      WHERE status = 'held' AND outcome IN ('settle','release') ORDER BY updated_at LIMIT 50`)
    for (const row of rows) {
      try {
        if (row.outcome === 'settle') await this.billing.settle(row.workspace_id, row.request_id, fromMicros(row.actual_micros))
        else await this.billing.release(row.workspace_id, row.request_id)
      } catch (error) {
        await this.source.query(`UPDATE billing_reservations SET updated_at = now(), review_reason = $3
          WHERE workspace_id = $1 AND request_id = $2 AND status = 'held' AND outcome IN ('settle','release')`,
        [row.workspace_id, row.request_id, error instanceof HttpException && error.getStatus() === 402 ? 'settlement_funds_insufficient' : 'settlement_retry_pending'])
        this.logger.warn(`计费恢复保留预占 ${row.request_id}: ${error instanceof Error ? error.message : 'unknown error'}`)
      }
    }
  }
}
