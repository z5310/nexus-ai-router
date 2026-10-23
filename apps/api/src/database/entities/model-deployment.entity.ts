import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { ModelEntity } from './model.entity'
import { ProviderChannelEntity } from './provider-channel.entity'

@Entity({ name: 'model_deployments' })
@Index(['modelId', 'channelId', 'upstreamModelId'], { unique: true })
@Index(['modelId', 'enabled', 'priority'])
export class ModelDeploymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'model_id', type: 'uuid' })
  modelId: string

  @ManyToOne(() => ModelEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'model_id' })
  model: ModelEntity

  @Column({ name: 'channel_id', type: 'uuid' })
  channelId: string

  @ManyToOne(() => ProviderChannelEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'channel_id' })
  channel: ProviderChannelEntity

  @Column({ name: 'upstream_model_id', length: 160 })
  upstreamModelId: string

  @Column({ type: 'integer', default: 100 })
  priority: number

  @Column({ type: 'integer', default: 100 })
  weight: number

  @Column({ default: true })
  enabled: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
