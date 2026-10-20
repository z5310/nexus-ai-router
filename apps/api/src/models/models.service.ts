import { Injectable, NotFoundException } from '@nestjs/common'
import type { CatalogModel, ModelFacets, ModelListResponse, OpenAIModelList, RankingListResponse, RankingMetric } from '@gateway/contracts'
import type { ModelEntity } from '../database/entities/model.entity'
import type { ListModelsQuery, ListRankingsQuery } from './dto/list-models.query'
import { ModelsRepository } from './models.repository'

@Injectable()
export class ModelsService {
  constructor(private readonly models: ModelsRepository) {}

  async list(query: ListModelsQuery): Promise<ModelListResponse> {
    const [[entities, total], facets] = await Promise.all([this.models.list(query), this.models.facets()])
    const mappedFacets: ModelFacets = { types: {}, providers: {} }
    for (const item of facets.types) mappedFacets.types[item.type] = Number(item.count)
    for (const item of facets.providers) mappedFacets.providers[item.provider] = Number(item.count)
    return {
      data: entities.map((entity) => this.mapModel(entity)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
      facets: mappedFacets,
    }
  }

  async detail(publicId: string): Promise<CatalogModel> {
    const entity = await this.models.findOne(publicId)
    if (!entity) throw new NotFoundException(`Model ${publicId} was not found`)
    return this.mapModel(entity)
  }

  async rankings(query: ListRankingsQuery): Promise<RankingListResponse> {
    const entities = await this.models.rankings(query)
    const metric = query.metric
    return {
      data: entities.map((entity, index) => ({
        ...this.mapModel(entity),
        rank: index + 1,
        metric,
        metricScore: this.metricScore(entity, metric),
      })),
      metric,
      updatedAt: new Date().toISOString(),
    }
  }

  async listOpenAI(): Promise<OpenAIModelList> {
    const entities = await this.models.listOpenAI()
    return {
      object: 'list',
      data: entities.map((model) => ({
        id: model.publicId,
        object: 'model',
        created: Math.floor(model.createdAt.getTime() / 1000),
        owned_by: model.owner,
      })),
    }
  }

  private metricScore(model: ModelEntity, metric: RankingMetric): number {
    return Number({
      overall: model.overallScore,
      coding: model.codingScore,
      cost: model.costScore,
      speed: model.speedScore,
    }[metric])
  }

  private mapModel(model: ModelEntity): CatalogModel {
    return {
      id: model.id,
      name: model.name,
      slug: model.publicId,
      owner: model.owner,
      provider: model.provider,
      type: model.modelType,
      descriptionKey: model.descriptionKey,
      inputPrice: Number(model.inputPrice),
      outputPrice: model.outputPrice === null ? null : Number(model.outputPrice),
      priceUnit: model.priceUnit,
      latencyMs: model.latencyMs,
      score: Number(model.overallScore),
      codingScore: Number(model.codingScore),
      costScore: Number(model.costScore),
      speedScore: Number(model.speedScore),
      costPerTask: Number(model.costPerTask),
      context: model.contextLabel,
      accent: model.accent,
      ...(model.tagKey ? { tagKey: model.tagKey } : {}),
      capabilities: model.capabilities,
      status: model.status,
      trend: model.trend,
      featured: model.isFeatured,
    }
  }
}
