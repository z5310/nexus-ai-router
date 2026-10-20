import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'usage_buckets' })
@Index(['bucketStart'], { unique: true })
export class UsageBucketEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'bucket_start', type: 'timestamptz' })
  bucketStart: Date

  @Column({ name: 'request_count', type: 'integer', default: 0 })
  requestCount: number

  @Column({ name: 'token_count', type: 'bigint', default: 0 })
  tokenCount: string

  @Column({ name: 'average_latency_ms', type: 'integer', default: 0 })
  averageLatencyMs: number

  @Column({ name: 'cost_cny', type: 'numeric', precision: 14, scale: 4, default: 0 })
  costCny: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
