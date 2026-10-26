import { BadGatewayException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import type { ProviderDeploymentAcceptanceResult, ProviderDeploymentTestResult } from '@gateway/contracts'
import { ModelDeploymentsRepository } from './model-deployments.repository'
import { ProviderChannelsRepository } from './provider-channels.repository'
import { ProviderDispatchNotStartedError, ProviderRuntimeService } from './provider-runtime.service'

@Injectable()
export class ProviderConnectivityService {
  constructor(
    private readonly deployments: ModelDeploymentsRepository,
    private readonly channels: ProviderChannelsRepository,
    private readonly runtime: ProviderRuntimeService,
  ) {}

  async testDeployment(id: string): Promise<ProviderDeploymentTestResult> {
    const deployment = await this.deployments.find(id)
    if (!deployment) throw new NotFoundException('模型部署不存在')
    const startedAt = performance.now()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), Math.min(deployment.channel.timeoutMs, 15_000))
    try {
      const response = await this.runtime.dispatch({
        provider: deployment.channel.provider,
        model: deployment.upstreamModelId,
        channelId: deployment.channelId,
        deploymentId: deployment.id,
      }, 'models', { method: 'GET', signal: controller.signal })
      if (!response.ok) {
        await response.body?.cancel()
        await this.channels.recordFailure(deployment.channelId, `probe_${response.status}`)
        throw new BadGatewayException(`供应商连接测试失败 (${response.status})`)
      }
      let payload: { data?: Array<{ id?: unknown }> }
      try {
        payload = await response.json() as { data?: Array<{ id?: unknown }> }
      } catch {
        await this.channels.recordFailure(deployment.channelId, 'probe_invalid_response')
        throw new BadGatewayException('供应商连接测试返回无效数据')
      }
      const models = Array.isArray(payload.data) ? payload.data : []
      const modelAvailable = models.some((item) => item?.id === deployment.upstreamModelId)
      if (!modelAvailable) {
        await this.channels.recordFailure(deployment.channelId, 'probe_model_not_found')
        throw new BadGatewayException('供应商连接成功，但未找到配置的上游模型')
      }
      await this.channels.recordSuccess(deployment.channelId)
      return {
        deploymentId: deployment.id,
        channelId: deployment.channelId,
        provider: deployment.channel.provider,
        upstreamModelId: deployment.upstreamModelId,
        latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
        checkedAt: new Date().toISOString(),
      }
    } catch (error) {
      if (error instanceof ProviderDispatchNotStartedError) throw new ServiceUnavailableException(error.message)
      if (error instanceof BadGatewayException || error instanceof ServiceUnavailableException) throw error
      if (error instanceof Error && error.name === 'AbortError') {
        await this.channels.recordFailure(deployment.channelId, 'probe_timeout')
        throw new ServiceUnavailableException('供应商连接测试超时')
      }
      await this.channels.recordFailure(deployment.channelId, 'probe_network_error')
      throw new ServiceUnavailableException('供应商连接测试失败')
    } finally {
      clearTimeout(timer)
    }
  }

  async acceptDeployment(id: string): Promise<ProviderDeploymentAcceptanceResult> {
    const discovery = await this.testDeployment(id)
    const deployment = await this.deployments.find(id)
    if (!deployment) throw new NotFoundException('模型部署不存在')
    const target = {
      provider: deployment.channel.provider,
      model: deployment.upstreamModelId,
      channelId: deployment.channelId,
      deploymentId: deployment.id,
    }
    const input = {
      model: deployment.upstreamModelId,
      messages: [{ role: 'user', content: 'Reply with exactly OK.' }],
      temperature: 0,
      max_tokens: 64,
    }

    try {
      const jsonStartedAt = performance.now()
      const jsonResponse = await this.dispatchWithTimeout(target, 'chat/completions', {
        method: 'POST', body: JSON.stringify({ ...input, stream: false }),
      }, deployment.channel.timeoutMs)
      await this.requireSuccess(jsonResponse, deployment.channelId)
      const json = await jsonResponse.json() as {
        choices?: Array<{ message?: { content?: unknown } }>
        usage?: { prompt_tokens?: unknown; completion_tokens?: unknown }
      }
      const jsonUsage = this.requireUsage(json.usage)
      if (!json.choices?.some((choice) => typeof choice.message?.content === 'string' && choice.message.content.trim().length > 0)) throw new BadGatewayException('供应商 JSON 验收响应缺少文本结果')
      const jsonLatencyMs = Math.max(0, Math.round(performance.now() - jsonStartedAt))

      const streamStartedAt = performance.now()
      const streamResponse = await this.dispatchWithTimeout(target, 'chat/completions', {
        method: 'POST', body: JSON.stringify({ ...input, stream: true, stream_options: { include_usage: true } }),
      }, deployment.channel.timeoutMs)
      await this.requireSuccess(streamResponse, deployment.channelId)
      const stream = await this.readAcceptanceStream(streamResponse)
      const streamLatencyMs = Math.max(0, Math.round(performance.now() - streamStartedAt))

      const cancelStartedAt = performance.now()
      const cancellation = new AbortController()
      const cancelTimeout = setTimeout(() => cancellation.abort(), Math.min(deployment.channel.timeoutMs, 30_000))
      try {
        const cancelResponse = await this.runtime.dispatch(target, 'chat/completions', {
          method: 'POST', body: JSON.stringify({ ...input, stream: true, stream_options: { include_usage: true } }), signal: cancellation.signal,
        })
        await this.requireSuccess(cancelResponse, deployment.channelId)
        const reader = cancelResponse.body?.getReader()
        if (!reader) throw new BadGatewayException('供应商取消验收缺少流式响应体')
        await reader.read()
        cancellation.abort()
        await reader.cancel().catch(() => undefined)
      } finally {
        clearTimeout(cancelTimeout)
      }

      await this.channels.recordSuccess(deployment.channelId)
      return {
        ...discovery,
        modelDiscovery: { latencyMs: discovery.latencyMs },
        jsonCompletion: { latencyMs: jsonLatencyMs, ...jsonUsage },
        streamCompletion: {
          latencyMs: streamLatencyMs,
          firstTokenLatencyMs: stream.firstTokenLatencyMs,
          ...stream.usage,
        },
        cancellation: { latencyMs: Math.max(0, Math.round(performance.now() - cancelStartedAt)), propagated: true },
      }
    } catch (error) {
      if (error instanceof ProviderDispatchNotStartedError) throw new ServiceUnavailableException(error.message)
      if (error instanceof BadGatewayException || error instanceof ServiceUnavailableException) throw error
      if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) throw new ServiceUnavailableException('供应商真实验收超时')
      throw new ServiceUnavailableException('供应商真实验收失败')
    }
  }

  private async dispatchWithTimeout(target: { provider: string; model: string; channelId: string; deploymentId: string }, path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    return this.runtime.dispatch(target, path, { ...init, signal: AbortSignal.timeout(Math.min(timeoutMs, 30_000)) })
  }

  private async requireSuccess(response: Response, channelId: string): Promise<void> {
    if (response.ok) return
    await response.body?.cancel().catch(() => undefined)
    await this.channels.recordFailure(channelId, `acceptance_${response.status}`)
    if (response.status === 401 || response.status === 403) throw new BadGatewayException('供应商拒绝凭证，请检查 API Key')
    if (response.status === 429) throw new ServiceUnavailableException('供应商验收触发限流，请稍后重试')
    throw new BadGatewayException(`供应商真实验收失败 (${response.status})`)
  }

  private requireUsage(usage: { prompt_tokens?: unknown; completion_tokens?: unknown } | undefined): { inputTokens: number; outputTokens: number } {
    const inputTokens = usage?.prompt_tokens
    const outputTokens = usage?.completion_tokens
    if (!Number.isSafeInteger(inputTokens) || !Number.isSafeInteger(outputTokens) || Number(inputTokens) < 0 || Number(outputTokens) < 0) {
      throw new BadGatewayException('供应商验收响应缺少可信用量')
    }
    return { inputTokens: Number(inputTokens), outputTokens: Number(outputTokens) }
  }

  private async readAcceptanceStream(response: Response): Promise<{ firstTokenLatencyMs: number; usage: { inputTokens: number; outputTokens: number } }> {
    if (!response.body) throw new BadGatewayException('供应商 SSE 验收缺少响应体')
    const startedAt = performance.now()
    let firstTokenLatencyMs: number | null = null
    let completed = false
    let usage: { inputTokens: number; outputTokens: number } | null = null
    let buffer = ''
    const decoder = new TextDecoder()
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true })
      const frames = buffer.split('\n\n')
      buffer = frames.pop() ?? ''
      for (const frame of frames) {
        for (const line of frame.split('\n')) {
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (data === '[DONE]') { completed = true; continue }
          const payload = JSON.parse(data) as { choices?: Array<{ delta?: { content?: unknown } }>; usage?: { prompt_tokens?: unknown; completion_tokens?: unknown } }
          if (firstTokenLatencyMs === null && payload.choices?.some((choice) => typeof choice.delta?.content === 'string' && choice.delta.content.length > 0)) firstTokenLatencyMs = Math.max(0, Math.round(performance.now() - startedAt))
          if (payload.usage) usage = this.requireUsage(payload.usage)
        }
      }
    }
    if (!completed || firstTokenLatencyMs === null || !usage) throw new BadGatewayException('供应商 SSE 验收未完整结束或缺少用量')
    return { firstTokenLatencyMs, usage }
  }
}
