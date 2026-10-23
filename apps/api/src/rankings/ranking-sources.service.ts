import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryFailedError, Repository } from 'typeorm'
import type { RankingMetric, RankingScoreSource, RankingSource, RankingSourceDetailResponse, RankingSourceListResponse } from '@gateway/contracts'
import { ModelEntity } from '../database/entities/model.entity'
import type { RankingSourceEntity } from '../database/entities/ranking-source.entity'
import type { CreateRankingSourceDto, UpdateRankingSourceDto, UpsertBenchmarkMappingDto } from './dto/ranking-sources.dto'
import { HuggingFaceLeaderboardClient } from './hugging-face-leaderboard.client'
import { RankingSourcesRepository, type ExternalModelScore } from './ranking-sources.repository'

@Injectable()
export class RankingSourcesService {
  constructor(
    private readonly repository: RankingSourcesRepository,
    private readonly huggingFace: HuggingFaceLeaderboardClient,
    @InjectRepository(ModelEntity) private readonly models: Repository<ModelEntity>,
  ) {}

  async list(): Promise<RankingSourceListResponse> {
    const [sources, counts] = await Promise.all([this.repository.list(), this.repository.counts()])
    return { data: sources.map((source) => this.mapSource(source, counts.get(source.id))) }
  }

  async detail(id: string): Promise<RankingSourceDetailResponse> {
    const source = await this.requireSource(id)
    const [counts, snapshots] = await Promise.all([this.repository.counts(), this.repository.latestSnapshots(id)])
    return {
      source: this.mapSource(source, counts.get(id)),
      snapshots: snapshots.map((item) => ({
        mappingId: item.mappingId,
        externalModelId: item.externalModelId, rank: item.rank, rawScore: Number(item.rawScore), normalizedScore: Number(item.normalizedScore),
        verified: item.verified, author: item.author, capturedAt: item.capturedAt.toISOString(),
        mappedModelId: item.mappedModelId, mappedModelName: item.mappedModelName,
      })),
    }
  }

  async create(actorUserId: string, input: CreateRankingSourceDto): Promise<RankingSource> {
    const datasetId = input.datasetId.trim()
    const source = this.repository.createSource({
      code: input.code.trim().toLowerCase(), name: input.name.trim(), adapter: input.adapter, datasetId,
      metric: input.metric, scoreMultiplier: String(input.scoreMultiplier ?? 1), priority: input.priority ?? 100,
      enabled: input.enabled ?? false, attributionLabel: input.attributionLabel.trim(),
      sourceUrl: `https://huggingface.co/datasets/${datasetId}`, createdByUserId: actorUserId,
    })
    return this.mapSource(await this.persist(source))
  }

  async update(id: string, input: UpdateRankingSourceDto): Promise<RankingSource> {
    if (Object.values(input).every((value) => value === undefined)) throw new BadRequestException('至少提供一个需要修改的字段')
    const source = await this.requireSource(id)
    if (input.name !== undefined) source.name = input.name.trim()
    if (input.metric !== undefined) source.metric = input.metric
    if (input.scoreMultiplier !== undefined) source.scoreMultiplier = String(input.scoreMultiplier)
    if (input.priority !== undefined) source.priority = input.priority
    if (input.enabled !== undefined) source.enabled = input.enabled
    if (input.attributionLabel !== undefined) source.attributionLabel = input.attributionLabel.trim()
    return this.mapSource(await this.persist(source))
  }

  async remove(id: string): Promise<void> { await this.repository.removeSource(await this.requireSource(id)) }

  async sync(id: string): Promise<RankingSourceDetailResponse> {
    const source = await this.requireSource(id)
    source.lastSyncedAt = new Date()
    try {
      const entries = await this.huggingFace.fetch(source.datasetId)
      if (!entries.length) throw new ServiceUnavailableException('外部榜单没有返回有效数据')
      const multiplier = Number(source.scoreMultiplier)
      const capturedAt = new Date()
      await this.repository.replaceSnapshotBatch(source, entries.map((entry) => ({
        ...entry, normalized: Math.min(100, Math.max(0, Number((entry.value * multiplier).toFixed(2)))),
      })), capturedAt)
    } catch (error) {
      source.lastError = (error instanceof Error ? error.message : '外部榜单同步失败').slice(0, 500)
      await this.repository.saveSource(source)
      throw error
    }
    return this.detail(id)
  }

  async mapModel(sourceId: string, input: UpsertBenchmarkMappingDto): Promise<RankingSourceDetailResponse> {
    await this.requireSource(sourceId)
    if (!await this.models.findOne({ where: { id: input.modelId } })) throw new NotFoundException('平台模型不存在')
    const externalModelId = input.externalModelId.trim()
    const snapshots = await this.repository.latestSnapshots(sourceId)
    if (!snapshots.some((item) => item.externalModelId === externalModelId)) throw new BadRequestException('外部模型不在该来源的最新快照中')
    await this.repository.upsertMapping(sourceId, input.modelId, externalModelId)
    return this.detail(sourceId)
  }

  async unmapModel(mappingId: string): Promise<void> {
    if (!await this.repository.removeMapping(mappingId)) throw new NotFoundException('模型映射不存在')
  }

  scores(metric: RankingMetric): Promise<Map<string, ExternalModelScore>> { return this.repository.externalScores(metric) }

  scoreSource(score: ExternalModelScore): RankingScoreSource {
    return { code: score.sourceCode, name: score.sourceName, url: score.sourceUrl, sampledAt: score.sampledAt.toISOString(), verified: score.verified, external: true }
  }

  private async requireSource(id: string): Promise<RankingSourceEntity> {
    const source = await this.repository.findSource(id)
    if (!source) throw new NotFoundException('排行榜来源不存在')
    return source
  }

  private async persist(source: RankingSourceEntity): Promise<RankingSourceEntity> {
    try { return await this.repository.saveSource(source) } catch (error) {
      if (error instanceof QueryFailedError && (error.driverError as { code?: string }).code === '23505') throw new ConflictException('排行榜来源标识已存在')
      throw error
    }
  }

  private mapSource(source: RankingSourceEntity, counts = { mappings: 0, snapshots: 0 }): RankingSource {
    return {
      id: source.id, code: source.code, name: source.name, adapter: source.adapter, datasetId: source.datasetId,
      metric: source.metric, scoreMultiplier: Number(source.scoreMultiplier), priority: source.priority, enabled: source.enabled,
      attributionLabel: source.attributionLabel, sourceUrl: source.sourceUrl,
      lastSyncedAt: source.lastSyncedAt?.toISOString() ?? null, lastSuccessAt: source.lastSuccessAt?.toISOString() ?? null,
      lastError: source.lastError, mappingCount: counts.mappings, snapshotCount: counts.snapshots,
      createdAt: source.createdAt.toISOString(), updatedAt: source.updatedAt.toISOString(),
    }
  }
}
