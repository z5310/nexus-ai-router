import { Injectable, NotFoundException } from '@nestjs/common'
import type { AdminModel, AdminModelListResponse, AdminModelSummaryResponse, CatalogModel, ModelFacets, ModelListResponse, OpenAIModelList, RankingListResponse, RankingMetric } from '@gateway/contracts'
import type { ModelEntity } from '../database/entities/model.entity'
import type { ListModelsQuery, ListRankingsQuery } from './dto/list-models.query'
import { ModelsRepository } from './models.repository'
import { WorkspaceModelsRepository } from './workspace-models.repository'

@Injectable()
export class ModelsService {
  constructor(private readonly models: ModelsRepository, private readonly workspaceModels: WorkspaceModelsRepository) {}

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
    const [entities, activity] = await Promise.all([this.models.rankings(query), this.models.activity()])
    const metric = query.metric
    const activityByModel = new Map(activity.map((item) => [item.publicId, item]))
    const totalCalls7d = activity.reduce((sum, item) => sum + item.calls7d, 0)
    return {
      data: entities.map((entity, index) => {
        const usage = activityByModel.get(entity.publicId) ?? { calls7d: 0, callsPrevious7d: 0 }
        return {
          ...this.mapModel(entity),
          rank: index + 1,
          metric,
          metricScore: this.metricScore(entity, metric),
          calls7d: usage.calls7d,
          usageShare: totalCalls7d === 0 ? 0 : Number(((usage.calls7d / totalCalls7d) * 100).toFixed(1)),
          weeklyGrowth: usage.callsPrevious7d === 0
            ? null
            : Number((((usage.calls7d - usage.callsPrevious7d) / usage.callsPrevious7d) * 100).toFixed(1)),
        }
      }),
      metric,
      updatedAt: new Date().toISOString(),
    }
  }

  async listOpenAI(workspaceId: string): Promise<OpenAIModelList> {
    const entities = await this.workspaceModels.listRoutable(workspaceId)
    return {
      object: 'list',
      data: entities.map(({ model }) => ({
        id: model.publicId,
        object: 'model',
        created: Math.floor(model.createdAt.getTime() / 1000),
        owned_by: model.owner,
      })),
    }
  }

  async adminList(query: string | undefined, page: number, pageSize: number): Promise<AdminModelListResponse> {
    const [entities, total] = await this.models.adminList(query, page, pageSize)
    return { data: entities.map((entity) => this.mapAdminModel(entity)), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
  }

  adminSummary(): Promise<AdminModelSummaryResponse> { return this.models.adminSummary() }

  async updateAdminModel(id: string, input: { enabled?: boolean; featured?: boolean; status?: 'stable' | 'observing' }): Promise<AdminModel> {
    const model = await this.models.findAdmin(id)
    if (!model) throw new NotFoundException('模型不存在')
    if (input.enabled !== undefined) model.isEnabled = input.enabled
    if (input.featured !== undefined) model.isFeatured = input.featured
    if (input.status !== undefined) model.status = input.status
    return this.mapAdminModel(await this.models.save(model))
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

  private mapAdminModel(model: ModelEntity): AdminModel {
    return { ...this.mapModel(model), enabled: model.isEnabled, updatedAt: model.updatedAt.toISOString() }
  }
}
