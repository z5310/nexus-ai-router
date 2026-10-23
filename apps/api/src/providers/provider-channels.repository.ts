import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProviderChannelEntity } from '../database/entities/provider-channel.entity'
import type { ProviderEnvironment } from '../database/entities/provider-credential.entity'

@Injectable()
export class ProviderChannelsRepository {
  constructor(@InjectRepository(ProviderChannelEntity) private readonly repository: Repository<ProviderChannelEntity>) {}

  list(filters: { provider?: string; environment?: ProviderEnvironment }): Promise<ProviderChannelEntity[]> {
    return this.repository.find({ where: filters, relations: { credential: true }, order: { provider: 'ASC', environment: 'ASC', name: 'ASC' } })
  }

  find(id: string): Promise<ProviderChannelEntity | null> {
    return this.repository.findOne({ where: { id }, relations: { credential: true } })
  }

  create(input: Partial<ProviderChannelEntity>): ProviderChannelEntity { return this.repository.create(input) }
  save(channel: ProviderChannelEntity): Promise<ProviderChannelEntity> { return this.repository.save(channel) }

  async remove(channel: ProviderChannelEntity): Promise<void> { await this.repository.remove(channel) }

  async recordSuccess(id: string): Promise<void> {
    await this.repository.createQueryBuilder().update().set({
      healthStatus: 'healthy',
      consecutiveFailures: 0,
      lastCheckedAt: () => 'CURRENT_TIMESTAMP',
      lastSuccessAt: () => 'CURRENT_TIMESTAMP',
      lastErrorCode: null,
      nextProbeAt: null,
    }).where('id = :id', { id })
      .andWhere(`(health_status != 'healthy' OR last_checked_at IS NULL OR last_checked_at < now() - interval '30 seconds')`)
      .execute()
  }

  async recordFailure(id: string, errorCode: string): Promise<void> {
    await this.repository.query(`
      UPDATE "provider_channels"
      SET "consecutive_failures" = "consecutive_failures" + 1,
          "health_status" = CASE WHEN "consecutive_failures" + 1 >= 3 THEN 'unhealthy' ELSE 'degraded' END,
          "last_checked_at" = now(),
          "last_failure_at" = now(),
          "last_error_code" = $2,
          "next_probe_at" = CASE WHEN "consecutive_failures" + 1 >= 3 THEN now() + interval '60 seconds' ELSE NULL END,
          "updated_at" = now()
      WHERE "id" = $1
    `, [id, errorCode.slice(0, 80)])
  }
}
