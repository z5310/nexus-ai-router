import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { RankingMetric } from '@gateway/contracts'
import { ModelBenchmarkMappingEntity } from './model-benchmark-mapping.entity'
import { BenchmarkSnapshotEntity } from './benchmark-snapshot.entity'

export type RankingSourceAdapter = 'huggingface'

@Entity({ name: 'ranking_sources' })
@Index(['code'], { unique: true })
@Index(['enabled', 'metric', 'priority'])
export class RankingSourceEntity {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column({ length: 60 }) code: string
  @Column({ length: 100 }) name: string
  @Column({ length: 30 }) adapter: RankingSourceAdapter
  @Column({ name: 'dataset_id', length: 200 }) datasetId: string
  @Column({ length: 20 }) metric: RankingMetric
  @Column({ name: 'score_multiplier', type: 'numeric', precision: 10, scale: 4, default: 1 }) scoreMultiplier: string
  @Column({ type: 'integer', default: 100 }) priority: number
  @Column({ default: false }) enabled: boolean
  @Column({ name: 'attribution_label', length: 120 }) attributionLabel: string
  @Column({ name: 'source_url', length: 500 }) sourceUrl: string
  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true }) lastSyncedAt: Date | null
  @Column({ name: 'last_success_at', type: 'timestamptz', nullable: true }) lastSuccessAt: Date | null
  @Column({ name: 'last_error', type: 'varchar', length: 500, nullable: true }) lastError: string | null
  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true }) createdByUserId: string | null
  @OneToMany(() => ModelBenchmarkMappingEntity, (mapping) => mapping.source) mappings: ModelBenchmarkMappingEntity[]
  @OneToMany(() => BenchmarkSnapshotEntity, (snapshot) => snapshot.source) snapshots: BenchmarkSnapshotEntity[]
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date
}
