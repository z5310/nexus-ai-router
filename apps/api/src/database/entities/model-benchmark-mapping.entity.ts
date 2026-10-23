import { CreateDateColumn, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { ModelEntity } from './model.entity'
import { RankingSourceEntity } from './ranking-source.entity'

@Entity({ name: 'model_benchmark_mappings' })
@Index(['sourceId', 'modelId'], { unique: true })
@Index(['sourceId', 'externalModelId'], { unique: true })
export class ModelBenchmarkMappingEntity {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column({ name: 'source_id', type: 'uuid' }) sourceId: string
  @ManyToOne(() => RankingSourceEntity, (source) => source.mappings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_id' }) source: RankingSourceEntity
  @Column({ name: 'model_id', type: 'uuid' }) modelId: string
  @ManyToOne(() => ModelEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'model_id' }) model: ModelEntity
  @Column({ name: 'external_model_id', length: 240 }) externalModelId: string
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date
}
