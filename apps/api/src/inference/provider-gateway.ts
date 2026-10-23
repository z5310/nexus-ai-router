import type { OpenAIChatCompletionChunk, OpenAIChatCompletionRequest, OpenAIChatCompletionResponse } from '@gateway/contracts'
import { ServiceUnavailableException } from '@nestjs/common'

/** The adapter guarantees no network request was issued. Other errors are ambiguous. */
export class ProviderNotDispatchedException extends ServiceUnavailableException {}

export const PROVIDER_GATEWAY = Symbol('PROVIDER_GATEWAY')

export interface ProviderTarget {
  provider: string
  model: string
  channelId?: string
  deploymentId?: string
  timeoutMs?: number
  maxConcurrency?: number
}

export interface ProviderGateway {
  chat(input: OpenAIChatCompletionRequest, target: ProviderTarget): Promise<OpenAIChatCompletionResponse>
  streamChat(input: OpenAIChatCompletionRequest, target: ProviderTarget, signal: AbortSignal): Promise<ProviderChatStream>
}

export interface ProviderChatStream {
  chunks: AsyncIterable<OpenAIChatCompletionChunk>
  cancel(): void
}
