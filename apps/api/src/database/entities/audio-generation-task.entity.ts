import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export type AudioGenerationTaskStatus = 'queued' | 'processing' | 'succeeded' | 'failed' | 'cancelled'
export type AudioResponseFormat = 'mp3' | 'wav' | 'flac'

@Entity({ name: 'audio_generation_tasks' })
@Index(['workspaceId', 'userId', 'createdAt'])
@Index(['workspaceId', 'status', 'createdAt'])
export class AudioGenerationTaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ name: 'model_id', type: 'uuid' })
  modelId: string

  @Column({ name: 'model_public_id', length: 120 })
  modelPublicId: string

  @Column({ name: 'model_name', length: 120 })
  modelName: string

  @Column({ length: 20 })
  status: AudioGenerationTaskStatus

  @Column({ type: 'text' })
  prompt: string

  @Column({ length: 80 })
  voice: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  instruction: string | null

  @Column({ type: 'varchar', length: 40, nullable: true })
  language: string | null

  @Column({ name: 'speech_rate', type: 'numeric', precision: 4, scale: 2 })
  speechRate: string

  @Column({ type: 'smallint' })
  pitch: number

  @Column({ type: 'numeric', precision: 4, scale: 2 })
  volume: string

  @Column({ name: 'sample_rate', type: 'integer' })
  sampleRate: number

  @Column({ type: 'integer' })
  bitrate: number

  @Column({ name: 'response_format', length: 10 })
  responseFormat: AudioResponseFormat

  @Column({ length: 60 })
  provider: string

  @Column({ name: 'upstream_model_id', length: 160 })
  upstreamModelId: string

  @Column({ name: 'channel_id', type: 'uuid', nullable: true })
  channelId: string | null

  @Column({ name: 'deployment_id', type: 'uuid', nullable: true })
  deploymentId: string | null

  @Column({ name: 'result_url', type: 'text', nullable: true })
  resultUrl: string | null

  @Column({ name: 'result_expires_at', type: 'timestamptz', nullable: true })
  resultExpiresAt: Date | null

  @Column({ name: 'duration_ms', type: 'integer', nullable: true })
  durationMs: number | null

  @Column({ name: 'estimated_cost_cny', type: 'numeric', precision: 12, scale: 6 })
  estimatedCostCny: string

  @Column({ name: 'settled_cost_cny', type: 'numeric', precision: 12, scale: 6, nullable: true })
  settledCostCny: string | null

  @Column({ name: 'error_code', type: 'varchar', length: 80, nullable: true })
  errorCode: string | null

  @Column({ name: 'error_message', type: 'varchar', length: 300, nullable: true })
  errorMessage: string | null

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
