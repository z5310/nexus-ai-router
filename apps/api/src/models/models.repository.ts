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

export interface ModelActivityResult {
  publicId: string
  calls7d: number
  callsPrevious7d: number
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

  async adminList(query: string | undefined, page: number, pageSize: number): Promise<[ModelEntity[], number]> {
    const builder = this.repository.createQueryBuilder('model')
    if (query?.trim()) {
      builder.where('(model.name ILIKE :query OR model.publicId ILIKE :query OR model.provider ILIKE :query)', { query: `%${query.trim()}%` })
    }
    return builder.orderBy('model.updatedAt', 'DESC').addOrderBy('model.name', 'ASC').skip((page - 1) * pageSize).take(pageSize).getManyAndCount()
  }

  async adminSummary(): Promise<{ total: number; enabled: number; featured: number; observing: number; providers: number }> {
    const row = await this.repository.createQueryBuilder('model')
      .select('COUNT(*)::int', 'total')
      .addSelect('COUNT(*) FILTER (WHERE model.isEnabled = true)::int', 'enabled')
      .addSelect('COUNT(*) FILTER (WHERE model.isFeatured = true)::int', 'featured')
      .addSelect("COUNT(*) FILTER (WHERE model.status = 'observing')::int", 'observing')
      .addSelect('COUNT(DISTINCT model.provider)::int', 'providers')
      .getRawOne<{ total: number; enabled: number; featured: number; observing: number; providers: number }>()
    return row ?? { total: 0, enabled: 0, featured: 0, observing: 0, providers: 0 }
  }

  findAdmin(id: string): Promise<ModelEntity | null> { return this.repository.findOne({ where: { id } }) }
  save(model: ModelEntity): Promise<ModelEntity> { return this.repository.save(model) }

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

  async activity(): Promise<ModelActivityResult[]> {
    const rows = await this.repository.manager.query(`
      SELECT
        model.public_id AS "publicId",
        COUNT(request.id) FILTER (WHERE request.created_at >= now() - interval '7 days')::int AS "calls7d",
        COUNT(request.id) FILTER (
          WHERE request.created_at >= now() - interval '14 days'
            AND request.created_at < now() - interval '7 days'
        )::int AS "callsPrevious7d"
      FROM models model
      LEFT JOIN request_logs request
        ON request.model_public_id = model.public_id
        AND request.created_at >= now() - interval '14 days'
      WHERE model.is_enabled = true
      GROUP BY model.public_id
    `) as Array<{ publicId: string; calls7d: number | string; callsPrevious7d: number | string }>

    return rows.map((row) => ({
      publicId: row.publicId,
      calls7d: Number(row.calls7d),
      callsPrevious7d: Number(row.callsPrevious7d),
    }))
  }
}
