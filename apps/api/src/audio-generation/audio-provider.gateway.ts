import { BadGatewayException, GatewayTimeoutException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AudioGenerationTaskEntity } from '../database/entities/audio-generation-task.entity'

export interface AudioProviderResult { url: string; durationMs: number | null; expiresAt: Date | null }

interface GatewayPayload {
  id?: string
  task_id?: string
  status?: string
  url?: string
  audio_url?: string
  result_url?: string
  duration_ms?: number
  expires_at?: string
  error?: { message?: string } | string
  data?: { url?: string; audio_url?: string; duration_ms?: number; expires_at?: string }
}

@Injectable()
export class AudioProviderGateway {
  constructor(private readonly config: ConfigService) {}

  async generate(task: AudioGenerationTaskEntity): Promise<AudioProviderResult> {
    const baseUrl = this.baseUrl()
    const timeoutMs = this.config.get<number>('AUDIO_GENERATION_TIMEOUT_MS', 300_000)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(`${baseUrl}/audios/generations`, {
        method: 'POST', headers: this.headers(task), signal: controller.signal,
        body: JSON.stringify({
          model: task.upstreamModelId, prompt: task.prompt, voice: task.voice,
          instruction: task.instruction ?? undefined, language: task.language ?? undefined,
          speech_rate: Number(task.speechRate), pitch: task.pitch, volume: Number(task.volume),
          sample_rate: task.sampleRate, bitrate: task.bitrate, response_format: task.responseFormat,
        }),
      })
      const payload = await this.payload(response)
      const direct = this.result(payload)
      if (direct) return direct
      const taskId = payload.task_id ?? payload.id
      if (!taskId) throw new BadGatewayException('音频供应商未返回结果地址或任务 ID')
      return await this.poll(baseUrl, taskId, task, controller.signal)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new GatewayTimeoutException('音频供应商处理超时')
      throw error
    } finally { clearTimeout(timer) }
  }

  private async poll(baseUrl: string, taskId: string, task: AudioGenerationTaskEntity, signal: AbortSignal): Promise<AudioProviderResult> {
    while (!signal.aborted) {
      await this.delay(signal)
      const response = await fetch(`${baseUrl}/audios/generations/${encodeURIComponent(taskId)}`, { headers: this.headers(task), signal })
      const payload = await this.payload(response)
      const result = this.result(payload)
      if (result) return result
      if (['failed', 'error', 'cancelled'].includes(payload.status?.toLowerCase() ?? '')) {
        const message = typeof payload.error === 'string' ? payload.error : payload.error?.message
        throw new BadGatewayException(message ?? '音频供应商任务执行失败')
      }
    }
    throw new GatewayTimeoutException('音频供应商处理超时')
  }

  private delay(signal: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')) }
      const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve() }, 2_000)
      signal.addEventListener('abort', abort, { once: true })
    })
  }

  private async payload(response: Response): Promise<GatewayPayload> {
    if (!response.ok) {
      await response.body?.cancel()
      throw new BadGatewayException(`音频供应商调用失败 (${response.status})`)
    }
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      await response.body?.cancel()
      throw new BadGatewayException('音频数据面必须返回可持久访问的结果 URL')
    }
    return response.json() as Promise<GatewayPayload>
  }

  private result(payload: GatewayPayload): AudioProviderResult | null {
    const url = payload.result_url ?? payload.audio_url ?? payload.url ?? payload.data?.audio_url ?? payload.data?.url
    if (!url) return null
    let parsed: URL
    try { parsed = new URL(url) } catch { throw new BadGatewayException('音频供应商返回了无效结果地址') }
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new BadGatewayException('音频结果地址协议不受支持')
    const expiresAt = payload.expires_at ?? payload.data?.expires_at
    const parsedExpiry = expiresAt ? new Date(expiresAt) : null
    return {
      url: parsed.toString(), durationMs: payload.duration_ms ?? payload.data?.duration_ms ?? null,
      expiresAt: parsedExpiry && !Number.isNaN(parsedExpiry.getTime()) ? parsedExpiry : null,
    }
  }

  private baseUrl(): string {
    const baseUrl = (this.config.get<string>('AUDIO_GENERATION_GATEWAY_URL') ?? this.config.get<string>('PROVIDER_GATEWAY_URL'))?.replace(/\/$/, '')
    if (!baseUrl) throw new ServiceUnavailableException('音频数据面尚未配置')
    return baseUrl
  }

  private headers(task: AudioGenerationTaskEntity): Record<string, string> {
    const apiKey = this.config.get<string>('PROVIDER_GATEWAY_API_KEY')
    return {
      accept: 'application/json', 'content-type': 'application/json',
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      'x-portkey-provider': task.provider,
      ...(task.channelId ? { 'x-nexus-channel-id': task.channelId } : {}),
      ...(task.deploymentId ? { 'x-nexus-deployment-id': task.deploymentId } : {}),
    }
  }
}
