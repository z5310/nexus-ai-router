import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { ModelType, RankingMetric } from '@gateway/contracts'
import { ModelEntity } from '../database/entities/model.entity'
import type { ListModelsQuery, ListRankingsQuery } from './dto/list-models.query'

export interface ModelFacetsResult {
  types: Array<{ type: ModelType; count: number }>
  providers: Array<{ provider: string; count: number }>
}

@Injectable()
export class ModelsRepository {
  constructor(
    @InjectRepository(ModelEntity)
    private readonly repository: Repository<ModelEntity>,
  ) {}

  async list(query: ListModelsQuery): Promise<[ModelEntity[], number]> {
    const builder = this.repository.createQueryBuilder('model').where('model.isEnabled = :enabled', { enabled: true })

    if (query.query?.trim()) {
      builder.andWhere(
        '(model.name ILIKE :query OR model.publicId ILIKE :query OR model.provider ILIKE :query)',
        { query: `%${query.query.trim()}%` },
      )
    }
    if (query.type) builder.andWhere('model.modelType = :type', { type: query.type })
    if (query.provider) builder.andWhere('model.provider = :provider', { provider: query.provider })

    const orders = {
      recommended: ['model.isFeatured', 'DESC', 'model.overallScore', 'DESC'],
      score: ['model.overallScore', 'DESC', 'model.name', 'ASC'],
      speed: ['model.latencyMs', 'ASC', 'model.name', 'ASC'],
      price: ['model.inputPrice', 'ASC', 'model.name', 'ASC'],
    } as const
    const [column, direction, secondary, secondaryDirection] = orders[query.sort]

    return builder
      .orderBy(column, direction)
      .addOrderBy(secondary, secondaryDirection)
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount()
  }

  async facets(): Promise<ModelFacetsResult> {
    const [types, providers] = await Promise.all([
      this.repository.createQueryBuilder('model')
        .select('model.modelType', 'type')
        .addSelect('COUNT(*)::int', 'count')
        .where('model.isEnabled = true')
        .groupBy('model.modelType')
        .getRawMany<{ type: ModelType; count: number }>(),
      this.repository.createQueryBuilder('model')
        .select('model.provider', 'provider')
        .addSelect('COUNT(*)::int', 'count')
        .where('model.isEnabled = true')
        .groupBy('model.provider')
        .getRawMany<{ provider: string; count: number }>(),
    ])
    return { types, providers }
  }

  findOne(publicId: string): Promise<ModelEntity | null> {
    return this.repository.findOne({ where: { publicId, isEnabled: true } })
  }

  listOpenAI(): Promise<ModelEntity[]> {
    return this.repository.find({ where: { isEnabled: true }, order: { createdAt: 'ASC' } })
  }

  rankings(query: ListRankingsQuery): Promise<ModelEntity[]> {
    const scoreColumn: Record<RankingMetric, string> = {
      overall: 'model.overallScore',
      coding: 'model.codingScore',
      cost: 'model.costScore',
      speed: 'model.speedScore',
    }
    const builder = this.repository.createQueryBuilder('model').where('model.isEnabled = true')
    if (query.provider) builder.andWhere('model.provider = :provider', { provider: query.provider })
    if (query.status) builder.andWhere('model.status = :status', { status: query.status })
    return builder.orderBy(scoreColumn[query.metric], 'DESC').addOrderBy('model.name', 'ASC').take(query.limit).getMany()
  }
}
