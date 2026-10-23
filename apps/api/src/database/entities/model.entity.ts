import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'models' })
@Index(['publicId'], { unique: true })
export class ModelEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'public_id', length: 120 })
  publicId: string

  @Column({ length: 120 })
  name: string

  @Column({ length: 40 })
  owner: string

  @Column({ length: 60, default: 'Nexus' })
  provider: string

  @Column({ name: 'model_type', length: 20, default: 'text' })
  modelType: 'text' | 'image' | 'video' | 'audio' | 'embedding'

  @Column({ name: 'description_key', length: 100, default: 'modelDesc.gpt' })
  descriptionKey: string

  @Column({ name: 'input_price', type: 'numeric', precision: 12, scale: 4, default: 0 })
  inputPrice: string

  @Column({ name: 'output_price', type: 'numeric', precision: 12, scale: 4, nullable: true })
  outputPrice: string | null

  @Column({ name: 'original_input_price', type: 'numeric', precision: 12, scale: 4, default: 0 })
  originalInputPrice: string

  @Column({ name: 'original_output_price', type: 'numeric', precision: 12, scale: 4, nullable: true })
  originalOutputPrice: string | null

  @Column({ name: 'discount_percent', type: 'numeric', precision: 5, scale: 2, default: 0 })
  discountPercent: string

  @Column({ name: 'price_effective_from', type: 'timestamptz', default: () => 'now()' })
  priceEffectiveFrom: Date

  @Column({ name: 'price_unit', length: 30, default: 'million_tokens' })
  priceUnit: 'million_tokens' | 'image' | 'second' | '10k_chars'

  @Column({ name: 'latency_ms', type: 'integer', default: 0 })
  latencyMs: number

  @Column({ name: 'overall_score', type: 'numeric', precision: 5, scale: 2, default: 0 })
  overallScore: string

  @Column({ name: 'coding_score', type: 'numeric', precision: 5, scale: 2, default: 0 })
  codingScore: string

  @Column({ name: 'cost_score', type: 'numeric', precision: 5, scale: 2, default: 0 })
  costScore: string

  @Column({ name: 'speed_score', type: 'numeric', precision: 5, scale: 2, default: 0 })
  speedScore: string

  @Column({ name: 'cost_per_task', type: 'numeric', precision: 12, scale: 4, default: 0 })
  costPerTask: string

  @Column({ name: 'context_label', length: 30, default: '128K' })
  contextLabel: string

  @Column({ length: 20, default: '#63e495' })
  accent: string

  @Column({ name: 'tag_key', type: 'varchar', length: 60, nullable: true })
  tagKey: string | null

  @Column({ type: 'text', array: true, default: '{}' })
  capabilities: string[]

  @Column({ length: 20, default: 'stable' })
  status: 'stable' | 'observing'

  @Column({ type: 'integer', nullable: true })
  trend: number | null

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean

  @Column({ name: 'is_enabled', default: true })
  isEnabled: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
