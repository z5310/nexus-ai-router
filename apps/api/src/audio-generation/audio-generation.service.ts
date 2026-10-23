import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import type { Queue } from 'bullmq'
import type { AudioGenerationTask, AudioGenerationTaskListResponse } from '@gateway/contracts'
import { InferenceRepository } from '../inference/inference.repository'
import { ProviderConfigurationService } from '../providers/provider-configuration.service'
import type { CreateAudioGenerationDto, ListAudioGenerationTasksQuery } from './audio-generation.dto'
import { AUDIO_GENERATION_QUEUE, type AudioGenerationJob } from './audio-generation.queue'
import { AudioGenerationRepository } from './audio-generation.repository'
import type { AudioGenerationTaskEntity } from '../database/entities/audio-generation-task.entity'

@Injectable()
export class AudioGenerationService {
  constructor(
    private readonly tasks: AudioGenerationRepository,
    private readonly inference: InferenceRepository,
    private readonly providers: ProviderConfigurationService,
    @InjectQueue(AUDIO_GENERATION_QUEUE) private readonly queue: Queue<AudioGenerationJob>,
  ) {}

  async create(workspaceId: string, userId: string, input: CreateAudioGenerationDto): Promise<AudioGenerationTask> {
    const prompt = input.prompt.trim()
    if (!prompt) throw new BadRequestException('请输入合成文本')
    if (!input.voice.trim()) throw new BadRequestException('请选择或填写音色')
    const configured = await this.inference.findRoutableModel(workspaceId, input.model.trim())
    if (!configured) throw new NotFoundException('请先在工作区启用此模型')
    if (configured.model.modelType !== 'audio') throw new BadRequestException('当前模型不支持音频生成')

    const taskId = crypto.randomUUID()
    const [target] = await this.providers.resolveTargets(configured.model, taskId)
    const task = this.tasks.create({
      id: taskId, workspaceId, userId, modelId: configured.model.id,
      modelPublicId: configured.model.publicId, modelName: configured.model.name, status: 'queued', prompt,
      voice: input.voice.trim(), instruction: input.instruction?.trim() || null, language: input.language?.trim() || null,
      speechRate: input.speech_rate.toFixed(2), pitch: input.pitch, volume: input.volume.toFixed(2),
      sampleRate: input.sample_rate, bitrate: input.bitrate, responseFormat: input.response_format,
      provider: target.provider, upstreamModelId: target.model, channelId: target.channelId ?? null,
      deploymentId: target.deploymentId ?? null, resultUrl: null, resultExpiresAt: null, durationMs: null,
      estimatedCostCny: (Number(configured.model.inputPrice) * prompt.length / 10_000).toFixed(6),
      settledCostCny: null, errorCode: null, errorMessage: null, startedAt: null, completedAt: null,
    })
    const saved = await this.tasks.save(task)
    try {
      await this.queue.add('generate', { taskId: saved.id }, { jobId: saved.id, removeOnComplete: 200, removeOnFail: 200 })
    } catch (error) {
      await this.tasks.markFailed(saved.id, 'queue_unavailable', '音频任务队列暂不可用')
      throw error
    }
    return this.map(saved)
  }

  async list(workspaceId: string, userId: string, query: ListAudioGenerationTasksQuery): Promise<AudioGenerationTaskListResponse> {
    return { data: (await this.tasks.list(workspaceId, userId, query.model?.trim() || undefined, query.limit)).map((task) => this.map(task)) }
  }

  async detail(id: string, workspaceId: string, userId: string): Promise<AudioGenerationTask> {
    const task = await this.tasks.findVisible(id, workspaceId, userId)
    if (!task) throw new NotFoundException('音频任务不存在')
    return this.map(task)
  }

  async cancel(id: string, workspaceId: string, userId: string): Promise<AudioGenerationTask> {
    const task = await this.tasks.findVisible(id, workspaceId, userId)
    if (!task) throw new NotFoundException('音频任务不存在')
    if (task.status === 'processing') throw new BadRequestException('任务已开始处理，当前供应商不支持中断')
    if (['succeeded', 'failed', 'cancelled'].includes(task.status)) throw new BadRequestException('当前任务状态不可取消')
    if (!await this.tasks.cancel(id, workspaceId, userId)) throw new BadRequestException('任务状态已变化，请刷新后重试')
    const job = await this.queue.getJob(id)
    if (job && ['waiting', 'delayed'].includes(await job.getState())) await job.remove()
    return this.detail(id, workspaceId, userId)
  }

  private map(task: AudioGenerationTaskEntity): AudioGenerationTask {
    const preview = task.prompt.length > 80 ? `${task.prompt.slice(0, 80)}…` : task.prompt
    return {
      id: task.id, model: task.modelPublicId, modelName: task.modelName, status: task.status,
      promptPreview: preview, voice: task.voice, instruction: task.instruction, language: task.language,
      speechRate: Number(task.speechRate), pitch: task.pitch, volume: Number(task.volume),
      sampleRate: task.sampleRate, bitrate: task.bitrate, responseFormat: task.responseFormat,
      estimatedCostCny: Number(task.estimatedCostCny), settledCostCny: task.settledCostCny === null ? null : Number(task.settledCostCny),
      resultUrl: task.resultUrl, resultExpiresAt: task.resultExpiresAt?.toISOString() ?? null,
      durationMs: task.durationMs, errorCode: task.errorCode, errorMessage: task.errorMessage,
      createdAt: task.createdAt.toISOString(), startedAt: task.startedAt?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
    }
  }
}
