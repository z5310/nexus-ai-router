import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { ModelEntity } from './model.entity'

@Entity({ name: 'workspace_models' })
@Index(['userId', 'modelId'], { unique: true })
export class WorkspaceModelEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ name: 'model_id', type: 'uuid' })
  modelId: string

  @ManyToOne(() => ModelEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'model_id' })
  model: ModelEntity

  @Column({ type: 'varchar', length: 120, nullable: true })
  alias: string | null

  @Column({ type: 'integer', default: 50 })
  priority: number

  @Column({ name: 'rate_limit_rpm', type: 'integer', default: 60 })
  rateLimitRpm: number

  @Column({ name: 'daily_budget_cny', type: 'numeric', precision: 12, scale: 2, nullable: true })
  dailyBudgetCny: string | null

  @Column({ default: true })
  enabled: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
