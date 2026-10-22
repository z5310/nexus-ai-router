import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RequestLogEntity } from '../database/entities/request-log.entity'
import { UsageBucketEntity } from '../database/entities/usage-bucket.entity'
import type { ListRequestLogsQuery } from './dto/list-request-logs.query'

export interface RequestLogRow extends RequestLogEntity {
  modelName: string
}

@Injectable()
export class DashboardRepository {
  constructor(
    @InjectRepository(UsageBucketEntity)
    private readonly usage: Repository<UsageBucketEntity>,
    @InjectRepository(RequestLogEntity)
    private readonly requestLogs: Repository<RequestLogEntity>,
  ) {}

  usageTrend(userId: string): Promise<UsageBucketEntity[]> {
    return this.usage.createQueryBuilder('usage')
      .where('usage.user_id = :userId', { userId })
      .andWhere('usage.bucketStart >= now() - interval \'24 hours\'')
      .orderBy('usage.bucketStart', 'ASC')
      .getMany()
  }

  async recentRequests(userId: string, query: ListRequestLogsQuery): Promise<RequestLogRow[]> {
    const builder = this.requestLogs.createQueryBuilder('request')
      .leftJoin('models', 'model', 'model.public_id = request.model_public_id')
      .select('request.id', 'id')
      .addSelect('request.request_id', 'requestId')
      .addSelect('request.model_public_id', 'modelPublicId')
      .addSelect('request.status', 'status')
      .addSelect('request.latency_ms', 'latencyMs')
      .addSelect('request.input_tokens', 'inputTokens')
      .addSelect('request.output_tokens', 'outputTokens')
      .addSelect('request.cost_cny', 'costCny')
      .addSelect('request.created_at', 'createdAt')
      .addSelect('COALESCE(model.name, request.model_public_id)', 'modelName')
      .where('request.user_id = :userId', { userId })

    if (query.query?.trim()) {
      builder.andWhere(
        '(request.request_id ILIKE :query OR request.model_public_id ILIKE :query OR model.name ILIKE :query)',
        { query: `%${query.query.trim()}%` },
      )
    }

    return builder.orderBy('request.created_at', 'DESC').take(query.limit).getRawMany<RequestLogRow>()
  }
}
