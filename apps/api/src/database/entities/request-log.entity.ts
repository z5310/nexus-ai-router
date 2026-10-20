import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'request_logs' })
@Index(['requestId'], { unique: true })
@Index(['createdAt'])
export class RequestLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'request_id', length: 80 })
  requestId: string

  @Column({ name: 'model_public_id', length: 120 })
  modelPublicId: string

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
