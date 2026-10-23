import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { RankingSourceEntity } from './ranking-source.entity'

@Entity({ name: 'benchmark_snapshots' })
@Index(['sourceId', 'externalModelId', 'capturedAt'], { unique: true })
@Index(['sourceId', 'capturedAt'])
export class BenchmarkSnapshotEntity {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column({ name: 'source_id', type: 'uuid' }) sourceId: string
  @ManyToOne(() => RankingSourceEntity, (source) => source.snapshots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_id' }) source: RankingSourceEntity
  @Column({ name: 'external_model_id', length: 240 }) externalModelId: string
  @Column({ type: 'integer' }) rank: number
  @Column({ name: 'raw_score', type: 'numeric', precision: 12, scale: 4 }) rawScore: string
  @Column({ name: 'normalized_score', type: 'numeric', precision: 5, scale: 2 }) normalizedScore: string
  @Column({ default: false }) verified: boolean
  @Column({ type: 'varchar', length: 160, nullable: true }) author: string | null
  @Column({ name: 'captured_at', type: 'timestamptz' }) capturedAt: Date
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}
