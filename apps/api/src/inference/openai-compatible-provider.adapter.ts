import { BadGatewayException, GatewayTimeoutException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'node:crypto'
import type { OpenAIChatCompletionRequest, OpenAIChatCompletionResponse } from '@gateway/contracts'
import type { ProviderGateway, ProviderTarget } from './provider-gateway'

@Injectable()
export class OpenAICompatibleProviderAdapter implements ProviderGateway {
  constructor(private readonly config: ConfigService) {}

  async chat(input: OpenAIChatCompletionRequest, target: ProviderTarget): Promise<OpenAIChatCompletionResponse> {
    const baseUrl = this.config.get<string>('PROVIDER_GATEWAY_URL')?.replace(/\/$/, '')
    if (!baseUrl) throw new ServiceUnavailableException('模型数据面尚未配置')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.config.get<number>('PROVIDER_GATEWAY_TIMEOUT_MS', 60_000))
    try {
      const apiKey = this.config.get<string>('PROVIDER_GATEWAY_API_KEY')
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
          'x-portkey-provider': target.provider,
        },
        body: JSON.stringify({ ...input, model: target.model, stream: false }),
        signal: controller.signal,
      })
      if (!response.ok) {
        await response.body?.cancel()
        throw new BadGatewayException(`模型供应商调用失败 (${response.status})`)
      }
      const result = await response.json() as Partial<OpenAIChatCompletionResponse>
      const promptTokens = result.usage?.prompt_tokens ?? 0
      const completionTokens = result.usage?.completion_tokens ?? 0
      return {
        id: result.id ?? `chatcmpl_${randomUUID().replaceAll('-', '')}`,
        object: 'chat.completion',
        created: result.created ?? Math.floor(Date.now() / 1000),
        model: input.model,
        choices: result.choices ?? [],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: result.usage?.total_tokens ?? promptTokens + completionTokens,
        },
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new GatewayTimeoutException('模型供应商响应超时')
      throw error
    } finally {
      clearTimeout(timer)
    }
  }
}
