import { HttpException } from '@nestjs/common'
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'
import type { Job } from 'bullmq'
import { AudioGenerationRepository } from './audio-generation.repository'
import { AudioProviderGateway } from './audio-provider.gateway'
import { ProviderConfigurationService, type ResolvedProviderTarget } from '../providers/provider-configuration.service'
import type { AudioGenerationTaskEntity } from '../database/entities/audio-generation-task.entity'
import { AUDIO_GENERATION_QUEUE, type AudioGenerationJob } from './audio-generation.queue'

@Processor(AUDIO_GENERATION_QUEUE, { concurrency: 4 })
export class AudioGenerationProcessor extends WorkerHost {
  constructor(
    private readonly tasks: AudioGenerationRepository,
    private readonly gateway: AudioProviderGateway,
    private readonly providers: ProviderConfigurationService,
  ) { super() }

  async process(job: Job<AudioGenerationJob>): Promise<void> {
    const task = await this.tasks.findById(job.data.taskId)
    if (!task || task.status !== 'queued') return
    if (!await this.tasks.markProcessing(task.id)) return
    const processing = await this.tasks.findById(task.id)
    if (!processing) return
    try {
      const result = await this.gateway.generate(processing)
      await this.tasks.markSucceeded(processing.id, result)
      await this.recordProviderResult(processing)
    } catch (error) {
      const code = error instanceof HttpException ? `upstream_${error.getStatus()}` : 'audio_generation_failed'
      const message = error instanceof Error ? error.message : '音频生成失败'
      await this.tasks.markFailed(processing.id, code, message)
      await this.recordProviderResult(processing, code)
    }
  }

  private async recordProviderResult(task: AudioGenerationTaskEntity, errorCode?: string): Promise<void> {
    const target: ResolvedProviderTarget = {
      provider: task.provider, model: task.upstreamModelId,
      channelId: task.channelId ?? undefined, deploymentId: task.deploymentId ?? undefined,
    }
    try { await this.providers.recordResult(target, errorCode) }
    catch (error) { console.error('Failed to update audio provider health', error) }
  }

  @OnWorkerEvent('error')
  onError(error: Error) { console.error('Audio generation worker error', error) }
}
