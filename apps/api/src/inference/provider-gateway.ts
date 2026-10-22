import type { OpenAIChatCompletionRequest, OpenAIChatCompletionResponse } from '@gateway/contracts'

export const PROVIDER_GATEWAY = Symbol('PROVIDER_GATEWAY')

export interface ProviderTarget {
  provider: string
  model: string
}

export interface ProviderGateway {
  chat(input: OpenAIChatCompletionRequest, target: ProviderTarget): Promise<OpenAIChatCompletionResponse>
}
