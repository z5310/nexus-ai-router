import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { RequestLogEntity } from './request-log.entity'

export type InferenceAttemptStatus = 'success' | 'failed' | 'cancelled'

@Entity({ name: 'inference_attempts' })
@Index(['requestLogId', 'attemptNumber'], { unique: true })
@Index(['workspaceId', 'createdAt'])
export class InferenceAttemptEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'request_log_id', type: 'uuid' })
  requestLogId: string

  @ManyToOne(() => RequestLogEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_log_id' })
  requestLog: RequestLogEntity

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string

  @Column({ name: 'attempt_number', type: 'smallint' })
  attemptNumber: number

  @Column({ name: 'model_public_id', length: 120 })
  modelPublicId: string

  @Column({ length: 60 })
  provider: string

  @Column({ name: 'channel_id', type: 'uuid', nullable: true })
  channelId: string | null

  @Column({ name: 'deployment_id', type: 'uuid', nullable: true })
  deploymentId: string | null

  @Column({ length: 20 })
  status: InferenceAttemptStatus

  @Column({ name: 'latency_ms', type: 'integer' })
  latencyMs: number

  @Column({ name: 'error_code', type: 'varchar', length: 80, nullable: true })
  errorCode: string | null

  @Column({ name: 'error_message', type: 'varchar', length: 300, nullable: true })
  errorMessage: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
