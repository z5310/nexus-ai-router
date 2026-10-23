import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { RequestPriceSnapshot } from '@gateway/contracts'

@Entity({ name: 'request_logs' })
@Index(['requestId'], { unique: true })
@Index(['createdAt'])
export class RequestLogEntity {
  @Column({ name: 'price_snapshot', type: 'jsonb', nullable: true })
  priceSnapshot: RequestPriceSnapshot | null

  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string

  @Column({ name: 'workspace_id', type: 'uuid' })
  @Index()
  workspaceId: string

  @Column({ name: 'request_id', length: 80 })
  requestId: string

  @Column({ name: 'model_public_id', length: 120 })
  modelPublicId: string

  @Column({ name: 'requested_model_public_id', length: 120 })
  requestedModelPublicId: string

  @Column({ name: 'route_rule_id', type: 'uuid', nullable: true })
  routeRuleId: string | null

  @Column({ name: 'attempt_count', type: 'smallint', default: 1 })
  attemptCount: number

  @Column({ name: 'first_token_latency_ms', type: 'integer', nullable: true })
  firstTokenLatencyMs: number | null

  @Column({ name: 'error_code', type: 'varchar', length: 80, nullable: true })
  errorCode: string | null

  @Column({ length: 20, default: 'success' })
  status: 'success' | 'failed'

  @Column({ name: 'latency_ms', type: 'integer' })
  latencyMs: number

  @Column({ name: 'input_tokens', type: 'integer', default: 0 })
  inputTokens: number

  @Column({ name: 'output_tokens', type: 'integer', default: 0 })
  outputTokens: number

  @Column({ name: 'cost_cny', type: 'numeric', precision: 12, scale: 6, default: 0 })
  costCny: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
