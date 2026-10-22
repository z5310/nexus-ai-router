import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { RouteMatchType, RouteStrategy } from '@gateway/contracts'
import { WorkspaceModelEntity } from './workspace-model.entity'

@Entity({ name: 'route_rules' })
@Index(['workspaceId', 'name'], { unique: true })
@Index(['workspaceId', 'enabled'])
export class RouteRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string

  @Column({ type: 'varchar', length: 80 })
  name: string

  @Column({ name: 'match_type', type: 'varchar', length: 20, default: 'all' })
  matchType: RouteMatchType

  @Column({ type: 'varchar', length: 24, default: 'priority' })
  strategy: RouteStrategy

  @Column({ name: 'primary_model_id', type: 'uuid' })
  primaryModelId: string

  @ManyToOne(() => WorkspaceModelEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'primary_model_id' })
  primaryModel: WorkspaceModelEntity

  @Column({ name: 'fallback_model_id', type: 'uuid', nullable: true })
  fallbackModelId: string | null

  @ManyToOne(() => WorkspaceModelEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fallback_model_id' })
  fallbackModel: WorkspaceModelEntity | null

  @Column({ name: 'traffic_percent', type: 'integer', default: 100 })
  trafficPercent: number

  @Column({ default: true })
  enabled: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
