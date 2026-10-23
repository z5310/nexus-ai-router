import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'model_price_versions' })
@Index(['modelId', 'effectiveFrom'])
export class ModelPriceVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'model_id', type: 'uuid' })
  modelId: string

  @Column({ name: 'input_price', type: 'numeric', precision: 12, scale: 4 })
  inputPrice: string

  @Column({ name: 'output_price', type: 'numeric', precision: 12, scale: 4, nullable: true })
  outputPrice: string | null

  @Column({ name: 'original_input_price', type: 'numeric', precision: 12, scale: 4 })
  originalInputPrice: string

  @Column({ name: 'original_output_price', type: 'numeric', precision: 12, scale: 4, nullable: true })
  originalOutputPrice: string | null

  @Column({ name: 'discount_percent', type: 'numeric', precision: 5, scale: 2 })
  discountPercent: string

  @Column({ name: 'price_unit', length: 30 })
  priceUnit: 'million_tokens' | 'image' | 'second' | '10k_chars'

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom: Date

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  effectiveTo: Date | null

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
