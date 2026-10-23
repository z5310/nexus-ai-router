import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import type { RankingMetric } from '@gateway/contracts'
import { BenchmarkSnapshotEntity } from '../database/entities/benchmark-snapshot.entity'
import { ModelBenchmarkMappingEntity } from '../database/entities/model-benchmark-mapping.entity'
import { RankingSourceEntity } from '../database/entities/ranking-source.entity'

export interface ExternalModelScore {
  modelId: string
  score: number
  sourceCode: string
  sourceName: string
  sourceUrl: string
  sampledAt: Date
  verified: boolean
}

@Injectable()
export class RankingSourcesRepository {
  constructor(
    @InjectRepository(RankingSourceEntity) private readonly sources: Repository<RankingSourceEntity>,
    @InjectRepository(ModelBenchmarkMappingEntity) private readonly mappings: Repository<ModelBenchmarkMappingEntity>,
    @InjectRepository(BenchmarkSnapshotEntity) private readonly snapshots: Repository<BenchmarkSnapshotEntity>,
    private readonly dataSource: DataSource,
  ) {}

  list(): Promise<RankingSourceEntity[]> { return this.sources.find({ order: { priority: 'ASC', name: 'ASC' } }) }
  findSource(id: string): Promise<RankingSourceEntity | null> { return this.sources.findOne({ where: { id } }) }
  createSource(input: Partial<RankingSourceEntity>): RankingSourceEntity { return this.sources.create(input) }
  saveSource(source: RankingSourceEntity): Promise<RankingSourceEntity> { return this.sources.save(source) }
  async removeSource(source: RankingSourceEntity): Promise<void> { await this.sources.remove(source) }

  async counts(): Promise<Map<string, { mappings: number; snapshots: number }>> {
    const rows = await this.dataSource.query(`
      SELECT source.id,
        COUNT(DISTINCT mapping.id)::int AS mappings,
        COUNT(DISTINCT snapshot.id)::int AS snapshots
      FROM ranking_sources source
      LEFT JOIN model_benchmark_mappings mapping ON mapping.source_id = source.id
      LEFT JOIN benchmark_snapshots snapshot ON snapshot.source_id = source.id
      GROUP BY source.id
    `) as Array<{ id: string; mappings: number | string; snapshots: number | string }>
    return new Map(rows.map((row) => [row.id, { mappings: Number(row.mappings), snapshots: Number(row.snapshots) }]))
  }

  findMapping(sourceId: string, modelId: string): Promise<ModelBenchmarkMappingEntity | null> { return this.mappings.findOne({ where: { sourceId, modelId } }) }
  async upsertMapping(sourceId: string, modelId: string, externalModelId: string): Promise<ModelBenchmarkMappingEntity> {
    await this.mappings.delete([{ sourceId, modelId }, { sourceId, externalModelId }])
    return this.mappings.save(this.mappings.create({ sourceId, modelId, externalModelId }))
  }
  async removeMapping(id: string): Promise<boolean> { return (await this.mappings.delete(id)).affected === 1 }

  async latestSnapshots(sourceId: string): Promise<Array<BenchmarkSnapshotEntity & { mappingId: string | null; mappedModelId: string | null; mappedModelName: string | null }>> {
    const latest = await this.snapshots.createQueryBuilder('snapshot').select('MAX(snapshot.capturedAt)', 'capturedAt').where('snapshot.sourceId = :sourceId', { sourceId }).getRawOne<{ capturedAt: Date | null }>()
    if (!latest?.capturedAt) return []
    const rows = await this.dataSource.query(`
      SELECT snapshot.*, mapping.id AS "mappingId", mapping.model_id AS "mappedModelId", model.name AS "mappedModelName"
      FROM benchmark_snapshots snapshot
      LEFT JOIN model_benchmark_mappings mapping ON mapping.source_id = snapshot.source_id AND mapping.external_model_id = snapshot.external_model_id
      LEFT JOIN models model ON model.id = mapping.model_id
      WHERE snapshot.source_id = $1 AND snapshot.captured_at = $2
      ORDER BY snapshot.rank ASC LIMIT 500
    `, [sourceId, latest.capturedAt]) as Array<Record<string, unknown>>
    return rows.map((row) => Object.assign(this.snapshots.create({
      id: row.id as string, sourceId: row.source_id as string, externalModelId: row.external_model_id as string,
      rank: Number(row.rank), rawScore: String(row.raw_score), normalizedScore: String(row.normalized_score),
      verified: Boolean(row.verified), author: row.author as string | null, capturedAt: new Date(row.captured_at as string), createdAt: new Date(row.created_at as string),
    }), { mappingId: row.mappingId as string | null, mappedModelId: row.mappedModelId as string | null, mappedModelName: row.mappedModelName as string | null }))
  }

  async replaceSnapshotBatch(source: RankingSourceEntity, entries: Array<{ rank: number; modelId: string; value: number; normalized: number; verified: boolean; author: string | null }>, capturedAt: Date): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(BenchmarkSnapshotEntity).save(entries.map((entry) => manager.getRepository(BenchmarkSnapshotEntity).create({
        sourceId: source.id, externalModelId: entry.modelId, rank: entry.rank, rawScore: String(entry.value),
        normalizedScore: String(entry.normalized), verified: entry.verified, author: entry.author, capturedAt,
      })), { chunk: 100 })
      source.lastSyncedAt = capturedAt
      source.lastSuccessAt = capturedAt
      source.lastError = null
      await manager.getRepository(RankingSourceEntity).save(source)
      await manager.query(`DELETE FROM benchmark_snapshots WHERE source_id = $1 AND captured_at NOT IN (SELECT captured_at FROM (SELECT DISTINCT captured_at FROM benchmark_snapshots WHERE source_id = $1 ORDER BY captured_at DESC LIMIT 30) retained)`, [source.id])
    })
  }

  async externalScores(metric: RankingMetric): Promise<Map<string, ExternalModelScore>> {
    const rows = await this.dataSource.query(`
      SELECT DISTINCT ON (mapping.model_id)
        mapping.model_id AS "modelId", snapshot.normalized_score AS score,
        source.code AS "sourceCode", source.attribution_label AS "sourceName", source.source_url AS "sourceUrl",
        snapshot.captured_at AS "sampledAt", snapshot.verified
      FROM model_benchmark_mappings mapping
      JOIN ranking_sources source ON source.id = mapping.source_id AND source.enabled = true AND source.metric = $1
      JOIN LATERAL (
        SELECT * FROM benchmark_snapshots candidate
        WHERE candidate.source_id = source.id AND candidate.external_model_id = mapping.external_model_id
        ORDER BY candidate.captured_at DESC LIMIT 1
      ) snapshot ON true
      ORDER BY mapping.model_id, source.priority ASC, snapshot.captured_at DESC
    `, [metric]) as Array<{ modelId: string; score: string; sourceCode: string; sourceName: string; sourceUrl: string; sampledAt: string; verified: boolean }>
    return new Map(rows.map((row) => [row.modelId, { ...row, score: Number(row.score), sampledAt: new Date(row.sampledAt) }]))
  }
}
