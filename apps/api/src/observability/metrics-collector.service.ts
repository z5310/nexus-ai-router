import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import type { Queue } from 'bullmq'
import type { Repository } from 'typeorm'
import { ProviderChannelEntity } from '../database/entities/provider-channel.entity'
import { AUDIO_GENERATION_QUEUE } from '../audio-generation/audio-generation.queue'
import { ObservabilityService } from './observability.service'

@Injectable()
export class MetricsCollectorService {
  constructor(
    private readonly metrics: ObservabilityService,
    @InjectRepository(ProviderChannelEntity) private readonly channels: Repository<ProviderChannelEntity>,
    @InjectQueue(AUDIO_GENERATION_QUEUE) private readonly audioQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  async collect(): Promise<string> {
    const timeoutMs = this.config.get<number>('METRICS_COLLECTION_TIMEOUT_MS', 1_000)
    const results = await Promise.allSettled([
      this.bounded(this.collectQueue(), timeoutMs),
      this.bounded(this.collectProviders(), timeoutMs),
    ])
    this.metrics.setCollectorSuccess('audio_queue', results[0].status === 'fulfilled')
    this.metrics.setCollectorSuccess('provider_channels', results[1].status === 'fulfilled')
    return this.metrics.render()
  }

  private async collectQueue(): Promise<void> {
    const counts = await this.audioQueue.getJobCounts('waiting', 'active', 'delayed', 'failed')
    for (const [state, value] of Object.entries(counts)) this.metrics.setQueueJobs(AUDIO_GENERATION_QUEUE, state, value)
  }

  private async collectProviders(): Promise<void> {
    const rows = await this.channels.createQueryBuilder('channel')
      .select('channel.provider', 'provider')
      .addSelect('channel.health_status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('channel.enabled = true')
      .groupBy('channel.provider')
      .addGroupBy('channel.health_status')
      .getRawMany<{ provider: string; status: string; count: string }>()
    this.metrics.resetProviderChannels()
    for (const row of rows) this.metrics.setProviderChannels(row.provider, row.status, Number(row.count))
  }

  private async bounded(operation: Promise<void>, timeoutMs: number): Promise<void> {
    let timer: NodeJS.Timeout | undefined
    try {
      await Promise.race([
        operation,
        new Promise<void>((_, reject) => { timer = setTimeout(() => reject(new Error('metrics collector timeout')), timeoutMs) }),
      ])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }
}
