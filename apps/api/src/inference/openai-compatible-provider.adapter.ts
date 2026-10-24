import { BadGatewayException, GatewayTimeoutException, Injectable, RequestTimeoutException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'node:crypto'
import type { OpenAIChatCompletionChunk, OpenAIChatCompletionRequest, OpenAIChatCompletionResponse } from '@gateway/contracts'
import type { ProviderChatStream, ProviderGateway, ProviderTarget } from './provider-gateway'
import { ProviderNotDispatchedException } from './provider-gateway'
import { ProviderDispatchNotStartedError, ProviderRuntimeService } from '../providers/provider-runtime.service'

interface StreamControl {
  controller: AbortController
  timedOut(): boolean
  clientAborted(): boolean
  refresh(): void
  cleanup(): void
}

@Injectable()
export class OpenAICompatibleProviderAdapter implements ProviderGateway {
  constructor(
    private readonly config: ConfigService,
    private readonly runtime: ProviderRuntimeService,
  ) {}

  async chat(input: OpenAIChatCompletionRequest, target: ProviderTarget): Promise<OpenAIChatCompletionResponse> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), target.timeoutMs ?? this.config.get<number>('PROVIDER_GATEWAY_TIMEOUT_MS', 60_000))
    try {
      const response = await this.runtime.dispatch(target, 'chat/completions', {
        method: 'POST',
        body: JSON.stringify({ ...input, model: target.model, stream: false }),
        signal: controller.signal,
      })
      if (!response.ok) {
        await response.body?.cancel()
        throw new BadGatewayException(`模型供应商调用失败 (${response.status})`)
      }
      const result = await response.json() as Partial<OpenAIChatCompletionResponse>
      if (!result.usage || ![result.usage.prompt_tokens, result.usage.completion_tokens].every((value) => Number.isSafeInteger(value) && value >= 0)) {
        throw new BadGatewayException('模型供应商未返回可信用量，需对账确认')
      }
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
      if (error instanceof ProviderDispatchNotStartedError) throw new ProviderNotDispatchedException(error.message)
      if (error instanceof Error && error.name === 'AbortError') throw new GatewayTimeoutException('模型供应商响应超时')
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  async streamChat(input: OpenAIChatCompletionRequest, target: ProviderTarget, signal: AbortSignal): Promise<ProviderChatStream> {
    if (signal.aborted) throw new ProviderNotDispatchedException('客户端已取消，尚未发送上游请求')
    const control = this.streamControl(signal, target.timeoutMs)
    try {
      const response = await this.runtime.dispatch(target, 'chat/completions', {
        method: 'POST',
        body: JSON.stringify({ ...input, model: target.model, stream: true, stream_options: { include_usage: true } }),
        signal: control.controller.signal,
      })
      if (!response.ok) {
        await response.body?.cancel()
        control.cleanup()
        throw new BadGatewayException(`模型供应商调用失败 (${response.status})`)
      }
      if (!response.body) {
        control.cleanup()
        throw new BadGatewayException('模型供应商未返回流式响应')
      }
      return {
        chunks: this.readStream(response.body, control),
        cancel: () => control.controller.abort(),
      }
    } catch (error) {
      control.cleanup()
      if (error instanceof ProviderDispatchNotStartedError) throw new ProviderNotDispatchedException(error.message)
      throw this.abortError(error, control.timedOut(), signal.aborted)
    }
  }

  private async *readStream(body: ReadableStream<Uint8Array>, control: StreamControl): AsyncGenerator<OpenAIChatCompletionChunk> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        control.refresh()
        buffer += decoder.decode(value, { stream: true })
        const events = this.takeEvents(buffer)
        buffer = events.remainder
        for (const event of events.values) {
          const chunk = this.parseEvent(event)
          if (chunk === 'done') return
          if (chunk) yield chunk
        }
      }
      buffer += decoder.decode()
      const trailing = this.parseEvent(buffer)
      if (trailing === 'done') return
      if (trailing) yield trailing
      throw new BadGatewayException('模型供应商流式响应未完整结束')
    } catch (error) {
      throw this.abortError(error, control.timedOut(), control.clientAborted())
    } finally {
      control.cleanup()
      reader.releaseLock()
    }
  }

  private parseEvent(event: string): OpenAIChatCompletionChunk | 'done' | null {
    const data = event.split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
      .trim()
    if (!data) return null
    if (data === '[DONE]') return 'done'

    let parsed: unknown
    try {
      parsed = JSON.parse(data)
    } catch {
      throw new BadGatewayException('模型供应商返回了无效的流式数据')
    }
    if (this.isUpstreamError(parsed)) throw new BadGatewayException('模型供应商流式响应失败')
    return parsed as OpenAIChatCompletionChunk
  }

  private takeEvents(buffer: string): { values: string[]; remainder: string } {
    const values: string[] = []
    let remainder = buffer
    while (true) {
      const match = /\r?\n\r?\n/.exec(remainder)
      if (!match || match.index === undefined) break
      values.push(remainder.slice(0, match.index))
      remainder = remainder.slice(match.index + match[0].length)
    }
    return { values, remainder }
  }

  private streamControl(externalSignal: AbortSignal, targetTimeoutMs?: number): StreamControl {
    const controller = new AbortController()
    const timeoutMs = targetTimeoutMs ?? this.config.get<number>('PROVIDER_GATEWAY_TIMEOUT_MS', 60_000)
    let timeout: NodeJS.Timeout
    let didTimeout = false
    const abortFromClient = () => controller.abort()
    const refresh = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        didTimeout = true
        controller.abort()
      }, timeoutMs)
    }
    externalSignal.addEventListener('abort', abortFromClient, { once: true })
    if (externalSignal.aborted) abortFromClient()
    refresh()
    return {
      controller,
      timedOut: () => didTimeout,
      clientAborted: () => externalSignal.aborted,
      refresh,
      cleanup: () => {
        clearTimeout(timeout)
        externalSignal.removeEventListener('abort', abortFromClient)
      },
    }
  }

  private abortError(error: unknown, timedOut: boolean, clientAborted: boolean): unknown {
    if (!(error instanceof Error) || error.name !== 'AbortError') return error
    if (timedOut) return new GatewayTimeoutException('模型供应商响应超时')
    if (clientAborted) return new RequestTimeoutException('客户端已取消请求')
    return new BadGatewayException('模型供应商流式响应中断')
  }

  private isUpstreamError(value: unknown): value is { error: unknown } {
    return typeof value === 'object' && value !== null && 'error' in value
  }
}
