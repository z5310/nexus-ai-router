import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import type { OpenAIChatCompletionResponse } from '@gateway/contracts'
import type { ApiKeyEntity } from '../database/entities/api-key.entity'
import type { ChatCompletionDto } from './dto/chat-completion.dto'
import { InferenceRepository } from './inference.repository'
import { PROVIDER_GATEWAY, type ProviderGateway } from './provider-gateway'

@Injectable()
export class InferenceService {
  private readonly logger = new Logger(InferenceService.name)

  constructor(
    private readonly inference: InferenceRepository,
    @Inject(PROVIDER_GATEWAY) private readonly provider: ProviderGateway,
  ) {}

  async chat(input: ChatCompletionDto, key: ApiKeyEntity, requestId: string = randomUUID()): Promise<OpenAIChatCompletionResponse> {
    if (input.stream) throw new BadRequestException('当前版本暂不支持流式响应')
    const config = await this.inference.findRoutableModel(key.workspaceId, input.model)
    if (!config) throw new NotFoundException('模型未在当前工作区启用')

    const startedAt = performance.now()
    let response: OpenAIChatCompletionResponse
    try {
      response = await this.provider.chat(input, {
        provider: config.model.owner.toLowerCase(),
        model: this.upstreamModelId(config.model.publicId),
      })
    } catch (error) {
      try {
        await this.inference.record({
          workspaceId: key.workspaceId,
          userId: key.userId,
          requestId,
          modelPublicId: config.model.publicId,
          status: 'failed',
          latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
          inputTokens: 0,
          outputTokens: 0,
          costCny: 0,
        })
      } catch (recordError) {
        this.logger.error('记录失败模型调用时发生错误', recordError instanceof Error ? recordError.stack : undefined)
      }
      throw error
    }

    const latencyMs = Math.max(0, Math.round(performance.now() - startedAt))
    const costCny = this.cost(
      response.usage.prompt_tokens,
      response.usage.completion_tokens,
      Number(config.model.inputPrice),
      Number(config.model.outputPrice ?? 0),
    )
    await this.inference.record({
      workspaceId: key.workspaceId,
      userId: key.userId,
      requestId,
      modelPublicId: config.model.publicId,
      status: 'success',
      latencyMs,
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
      costCny,
    })
    return { ...response, model: config.model.publicId }
  }

  private upstreamModelId(publicId: string): string {
    const separator = publicId.indexOf('/')
    return separator === -1 ? publicId : publicId.slice(separator + 1)
  }

  private cost(inputTokens: number, outputTokens: number, inputPrice: number, outputPrice: number): number {
    return (inputTokens * inputPrice + outputTokens * outputPrice) / 1_000_000
  }
}
