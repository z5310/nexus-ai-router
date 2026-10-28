import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { ConfigService } from '@nestjs/config'
import type { Queue } from 'bullmq'
import { DataSource, EntityManager } from 'typeorm'
import { MeteringOutboxEventEntity, type InferenceMeteringPayload } from '../database/entities/metering-outbox-event.entity'
import type { RecordedInference } from '../inference/inference.repository'
import { ObservabilityService } from '../observability/observability.service'
import { METERING_QUEUE, type MeteringJob } from './metering.queue'

export type MeteringConsumeOutcome = 'processed' | 'duplicate' | 'failed' | 'dead_lettered'

@Injectable()
export class MeteringOutboxService {
  private readonly logger = new Logger(MeteringOutboxService.name)

  constructor(
    private readonly source: DataSource,
    @InjectQueue(METERING_QUEUE) private readonly queue: Queue<MeteringJob>,
    private readonly config: ConfigService,
    private readonly metrics: ObservabilityService,
  ) {}

  async append(manager: EntityManager, requestLogId: string, input: RecordedInference): Promise<string> {
    const bucketStart = new Date()
    bucketStart.setUTCMinutes(0, 0, 0)
    const repository = manager.getRepository(MeteringOutboxEventEntity)
    const event = await repository.save(repository.create({
      eventType: 'inference.recorded',
      aggregateId: requestLogId,
      workspaceId: input.workspaceId,
      payload: {
        version: 1,
        workspaceId: input.workspaceId,
        userId: input.userId,
        bucketStart: bucketStart.toISOString(),
        tokenCount: input.inputTokens + input.outputTokens,
        latencyMs: input.latencyMs,
        costCny: input.costCny.toFixed(6),
      },
      attemptCount: 0,
      availableAt: new Date(),
      processedAt: null,
      deadLetteredAt: null,
      lastError: null,
    }))
    return event.id
  }

  notify(eventId: string): void {
    void this.enqueue(eventId).catch((error) => {
      this.metrics.recordMeteringOutcome('dispatch_failed')
      this.logger.warn(`计量事件等待恢复扫描 ${eventId}: ${error instanceof Error ? error.message : 'unknown error'}`)
    })
  }

  async dispatchPending(): Promise<number> {
    const limit = this.config.get<number>('METERING_OUTBOX_BATCH_SIZE', 100)
    const rows = await this.source.query(`SELECT id FROM metering_outbox_events
      WHERE processed_at IS NULL AND dead_lettered_at IS NULL AND available_at <= now()
      ORDER BY available_at, created_at LIMIT $1`, [limit]) as Array<{ id: string }>
    await Promise.allSettled(rows.map((row) => this.enqueue(row.id)))
    return rows.length
  }

  async consume(eventId: string): Promise<MeteringConsumeOutcome> {
    const startedAt = performance.now()
    try {
      const outcome = await this.source.transaction(async (manager): Promise<'processed' | 'duplicate'> => {
        const [event] = await manager.query(`SELECT * FROM metering_outbox_events WHERE id = $1 FOR UPDATE`, [eventId])
        if (!event || event.processed_at || event.dead_lettered_at) return 'duplicate'
        const payload = this.payload(event.payload)
        await manager.query(`INSERT INTO usage_buckets (
          workspace_id, user_id, bucket_start, request_count, token_count,
          average_latency_ms, cost_cny, created_at, updated_at
        ) VALUES ($1, $2, $3, 1, $4, $5, $6, now(), now())
        ON CONFLICT (workspace_id, bucket_start) DO UPDATE SET
          request_count = usage_buckets.request_count + 1,
          token_count = usage_buckets.token_count + EXCLUDED.token_count,
          average_latency_ms = round(
            ((usage_buckets.average_latency_ms * usage_buckets.request_count) + EXCLUDED.average_latency_ms)::numeric
            / (usage_buckets.request_count + 1)
          ),
          cost_cny = usage_buckets.cost_cny + EXCLUDED.cost_cny,
          updated_at = now()`, [payload.workspaceId, payload.userId, payload.bucketStart, payload.tokenCount, payload.latencyMs, payload.costCny])
        await manager.query(`UPDATE metering_outbox_events SET processed_at = now(), last_error = NULL, updated_at = now()
          WHERE id = $1`, [eventId])
        return 'processed'
      })
      this.metrics.recordMeteringOutcome(outcome, (performance.now() - startedAt) / 1_000)
      return outcome
    } catch (error) {
      const deadLettered = await this.markFailure(eventId, error)
      const outcome = deadLettered ? 'dead_lettered' : 'failed'
      this.metrics.recordMeteringOutcome(outcome, (performance.now() - startedAt) / 1_000)
      return outcome
    }
  }

  async list(status: 'pending' | 'dead' | 'processed', limit: number): Promise<{ data: unknown[] }> {
    const where = status === 'pending'
      ? 'processed_at IS NULL AND dead_lettered_at IS NULL'
      : status === 'dead' ? 'dead_lettered_at IS NOT NULL' : 'processed_at IS NOT NULL'
    const rows = await this.source.query(`SELECT id, event_type AS "eventType", aggregate_id AS "requestLogId",
      workspace_id AS "workspaceId", attempt_count AS "attemptCount", available_at AS "availableAt",
      processed_at AS "processedAt", dead_lettered_at AS "deadLetteredAt", last_error AS "lastError", created_at AS "createdAt"
      FROM metering_outbox_events WHERE ${where} ORDER BY created_at DESC LIMIT $1`, [limit])
    return { data: rows.map((row: Record<string, unknown>) => this.dates(row)) }
  }

  async replay(eventId: string): Promise<{ id: string; status: 'pending' }> {
    const result = await this.source.query(`UPDATE metering_outbox_events SET attempt_count = 0, available_at = now(),
      dead_lettered_at = NULL, last_error = NULL, updated_at = now()
      WHERE id = $1 AND processed_at IS NULL AND dead_lettered_at IS NOT NULL RETURNING id`, [eventId])
    const row = Array.isArray(result[0]) ? result[0][0] : result[0]
    if (!row) throw new NotFoundException('计量失败事件不存在或已处理')
    this.notify(eventId)
    return { id: eventId, status: 'pending' }
  }

  private async enqueue(eventId: string): Promise<void> {
    let timer: NodeJS.Timeout | undefined
    try {
      await Promise.race([
        this.queue.add('consume', { eventId }, { jobId: eventId, attempts: 1, removeOnComplete: true, removeOnFail: true }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('metering queue timeout')), 500) }),
      ])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  private async markFailure(eventId: string, error: unknown): Promise<boolean> {
    const maxAttempts = this.config.get<number>('METERING_OUTBOX_MAX_ATTEMPTS', 10)
    const message = (error instanceof Error ? error.message : 'unknown error').slice(0, 300)
    const result = await this.source.query(`UPDATE metering_outbox_events SET
      attempt_count = attempt_count + 1,
      available_at = now() + LEAST(300, power(2, attempt_count + 1)) * interval '1 second',
      dead_lettered_at = CASE WHEN attempt_count + 1 >= $2 THEN now() ELSE NULL END,
      last_error = $3, updated_at = now()
      WHERE id = $1 AND processed_at IS NULL AND dead_lettered_at IS NULL
      RETURNING attempt_count AS "attemptCount", dead_lettered_at AS "deadLetteredAt"`, [eventId, maxAttempts, message])
    const row = Array.isArray(result[0]) ? result[0][0] : result[0]
    return Boolean(row?.deadLetteredAt) || Number(row?.attemptCount ?? 0) >= maxAttempts
  }

  private payload(value: unknown): InferenceMeteringPayload {
    if (!value || typeof value !== 'object') throw new BadRequestException('计量事件载荷无效')
    const payload = value as Partial<InferenceMeteringPayload>
    if (payload.version !== 1 || !payload.workspaceId || !payload.userId || !payload.bucketStart
      || !Number.isSafeInteger(payload.tokenCount) || payload.tokenCount! < 0
      || !Number.isSafeInteger(payload.latencyMs) || payload.latencyMs! < 0
      || typeof payload.costCny !== 'string' || !/^\d+(\.\d{1,6})?$/.test(payload.costCny)) {
      throw new BadRequestException('计量事件载荷无效')
    }
    return payload as InferenceMeteringPayload
  }

  private dates(row: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value]))
  }
}
