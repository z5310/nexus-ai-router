import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export interface InferenceMeteringPayload {
  version: 1
  workspaceId: string
  userId: string
  bucketStart: string
  tokenCount: number
  latencyMs: number
  costCny: string
}

@Entity({ name: 'metering_outbox_events' })
@Index(['eventType', 'aggregateId'], { unique: true })
@Index(['availableAt', 'createdAt'])
export class MeteringOutboxEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'event_type', type: 'varchar', length: 40 })
  eventType: 'inference.recorded'

  @Column({ name: 'aggregate_id', type: 'uuid' })
  aggregateId: string

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string

  @Column({ type: 'jsonb' })
  payload: InferenceMeteringPayload

  @Column({ name: 'attempt_count', type: 'integer', default: 0 })
  attemptCount: number

  @Column({ name: 'available_at', type: 'timestamptz', default: () => 'now()' })
  availableAt: Date

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date | null

  @Column({ name: 'dead_lettered_at', type: 'timestamptz', nullable: true })
  deadLetteredAt: Date | null

  @Column({ name: 'last_error', type: 'varchar', length: 300, nullable: true })
  lastError: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
