import { HttpException, Inject, Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import type { OpenAIChatCompletionChunk, OpenAIChatCompletionResponse } from '@gateway/contracts'
import type { ApiKeyEntity } from '../database/entities/api-key.entity'
import type { WorkspaceModelEntity } from '../database/entities/workspace-model.entity'
import type { ChatCompletionDto } from './dto/chat-completion.dto'
import { InferenceRepository, type RecordedInference, type RecordedInferenceAttempt } from './inference.repository'
import { PROVIDER_GATEWAY, type ProviderChatStream, type ProviderGateway } from './provider-gateway'
import { ConfigService } from '@nestjs/config'
import { TrafficControlService, type TrafficLease } from '../traffic-control/traffic-control.service'
import { RoutingExecutorService, type RoutingDecision } from './routing-executor.service'
import { ProviderConfigurationService, type ResolvedProviderTarget } from '../providers/provider-configuration.service'

export interface InferenceChatStream {
  chunks: AsyncIterable<OpenAIChatCompletionChunk>
  cancel(): void
}

@Injectable()
export class InferenceService {
  private readonly logger = new Logger(InferenceService.name)

  constructor(
    private readonly inference: InferenceRepository,
    @Inject(PROVIDER_GATEWAY) private readonly provider: ProviderGateway,
    private readonly traffic: TrafficControlService,
    private readonly config: ConfigService,
    private readonly routing: RoutingExecutorService,
    private readonly deployments: ProviderConfigurationService,
  ) {}

  async chat(input: ChatCompletionDto, key: Pick<ApiKeyEntity, 'workspaceId' | 'userId'>, requestId: string = randomUUID()): Promise<OpenAIChatCompletionResponse> {
    const decision = await this.routing.resolve(key.workspaceId, input.model, requestId)
    const lease = await this.acquireConcurrency(key.workspaceId)
    const startedAt = performance.now()
    const attempts: RecordedInferenceAttempt[] = []
    let selected = decision.candidates[0]
    let response: OpenAIChatCompletionResponse | undefined
    let lastError: unknown

    try {
      candidateLoop: for (const candidate of decision.candidates) {
        selected = candidate
        await this.consumeModelRate(key.workspaceId, candidate)
        for (const target of await this.deployments.resolveTargets(candidate.model, requestId)) {
          const attemptStartedAt = performance.now()
          let channelLease: TrafficLease | undefined
          let providerCalled = false
          try {
            channelLease = await this.acquireChannelConcurrency(target)
            providerCalled = true
            response = await this.provider.chat(input, target)
            attempts.push(this.attempt(candidate, target, 'success', attemptStartedAt))
            await this.safeRecordResult(target)
            break candidateLoop
          } catch (error) {
            lastError = error
            const errorInfo = this.errorInfo(error)
            attempts.push(this.attempt(candidate, target, 'failed', attemptStartedAt, error))
            if (providerCalled) await this.safeRecordResult(target, errorInfo.code)
          } finally {
            await channelLease?.release()
          }
        }
      }

      if (!response) {
        await this.safeRecord(this.recordInput({ decision, key, requestId, selected, attempts, status: 'failed', startedAt, error: lastError }))
        throw lastError
      }

      const costCny = this.cost(
        response.usage.prompt_tokens,
        response.usage.completion_tokens,
        Number(selected.model.inputPrice),
        Number(selected.model.outputPrice ?? 0),
      )
      await this.inference.record(this.recordInput({
        decision,
        key,
        requestId,
        selected,
        attempts,
        status: 'success',
        startedAt,
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        costCny,
      }))
      return { ...response, model: selected.model.publicId }
    } finally {
      await lease.release()
    }
  }

  async streamChat(
    input: ChatCompletionDto,
    key: Pick<ApiKeyEntity, 'workspaceId' | 'userId'>,
    signal: AbortSignal,
    requestId: string = randomUUID(),
  ): Promise<InferenceChatStream> {
    const decision = await this.routing.resolve(key.workspaceId, input.model, requestId)
    const lease = await this.acquireConcurrency(key.workspaceId)
    const startedAt = performance.now()
    const attempts: RecordedInferenceAttempt[] = []
    let lastError: unknown
    let selected = decision.candidates[0]

    for (const candidate of decision.candidates) {
      selected = candidate
      try {
        await this.consumeModelRate(key.workspaceId, candidate)
      } catch (error) {
        await lease.release()
        throw error
      }
      for (const target of await this.deployments.resolveTargets(candidate.model, requestId)) {
        const attemptStartedAt = performance.now()
        let channelLease: TrafficLease | undefined
        let providerCalled = false
        let providerStream: ProviderChatStream
        try {
          channelLease = await this.acquireChannelConcurrency(target)
          providerCalled = true
          providerStream = await this.provider.streamChat(input, target, signal)
        } catch (error) {
          await channelLease?.release()
          lastError = error
          attempts.push(this.attempt(candidate, target, signal.aborted ? 'cancelled' : 'failed', attemptStartedAt, error))
          if (!signal.aborted && providerCalled) await this.safeRecordResult(target, this.errorInfo(error).code)
          if (signal.aborted) break
          continue
        }

        return {
          chunks: this.trackStream(providerStream.chunks, {
            decision,
            key,
            requestId,
            selected: candidate,
            target,
            attempts,
            attemptStartedAt,
            startedAt,
            signal,
            lease,
            channelLease,
          }),
          cancel: () => {
            providerStream.cancel()
            void channelLease?.release()
            void lease.release()
          },
        }
      }
    }

    await this.safeRecord(this.recordInput({ decision, key, requestId, selected, attempts, status: 'failed', startedAt, error: lastError }))
    await lease.release()
    throw lastError
  }

  private async *trackStream(
    chunks: AsyncIterable<OpenAIChatCompletionChunk>,
    context: {
      decision: RoutingDecision
      key: Pick<ApiKeyEntity, 'workspaceId' | 'userId'>
      requestId: string
      selected: WorkspaceModelEntity
      target: ResolvedProviderTarget
      attempts: RecordedInferenceAttempt[]
      attemptStartedAt: number
      startedAt: number
      signal: AbortSignal
      lease: TrafficLease
      channelLease?: TrafficLease
    },
  ): AsyncGenerator<OpenAIChatCompletionChunk> {
    let inputTokens = 0
    let outputTokens = 0
    let firstTokenLatencyMs: number | null = null
    let completed = false
    let streamError: unknown
    try {
      for await (const chunk of chunks) {
        if (firstTokenLatencyMs === null) firstTokenLatencyMs = this.elapsed(context.startedAt)
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens
          outputTokens = chunk.usage.completion_tokens
        }
        yield { ...chunk, model: context.selected.model.publicId }
      }
      completed = true
    } catch (error) {
      streamError = error
      throw error
    } finally {
      await context.lease.release()
      await context.channelLease?.release()
      const attemptStatus = completed ? 'success' : context.signal.aborted ? 'cancelled' : 'failed'
      context.attempts.push(this.attempt(context.selected, context.target, attemptStatus, context.attemptStartedAt, streamError))
      if (completed) await this.safeRecordResult(context.target)
      else if (!context.signal.aborted) await this.safeRecordResult(context.target, this.errorInfo(streamError).code)
      await this.safeRecord(this.recordInput({
        decision: context.decision,
        key: context.key,
        requestId: context.requestId,
        selected: context.selected,
        attempts: context.attempts,
        status: completed ? 'success' : 'failed',
        startedAt: context.startedAt,
        firstTokenLatencyMs,
        error: completed ? undefined : streamError,
        inputTokens,
        outputTokens,
        costCny: completed
          ? this.cost(inputTokens, outputTokens, Number(context.selected.model.inputPrice), Number(context.selected.model.outputPrice ?? 0))
          : 0,
      }))
    }
  }

  private recordInput(input: {
    decision: RoutingDecision
    key: Pick<ApiKeyEntity, 'workspaceId' | 'userId'>
    requestId: string
    selected: WorkspaceModelEntity
    attempts: RecordedInferenceAttempt[]
    status: 'success' | 'failed'
    startedAt: number
    firstTokenLatencyMs?: number | null
    error?: unknown
    inputTokens?: number
    outputTokens?: number
    costCny?: number
  }): RecordedInference {
    return {
      workspaceId: input.key.workspaceId,
      userId: input.key.userId,
      requestId: input.requestId,
      requestedModelPublicId: input.decision.requested.model.publicId,
      modelPublicId: input.selected.model.publicId,
      routeRuleId: input.decision.routeRuleId,
      status: input.status,
      latencyMs: this.elapsed(input.startedAt),
      firstTokenLatencyMs: input.firstTokenLatencyMs ?? null,
      errorCode: input.error === undefined ? null : this.errorInfo(input.error).code,
      inputTokens: input.inputTokens ?? 0,
      outputTokens: input.outputTokens ?? 0,
      costCny: input.costCny ?? 0,
      attempts: input.attempts,
    }
  }

  private attempt(
    candidate: WorkspaceModelEntity,
    target: ResolvedProviderTarget,
    status: RecordedInferenceAttempt['status'],
    startedAt: number,
    error?: unknown,
  ): RecordedInferenceAttempt {
    const errorInfo = error === undefined ? null : this.errorInfo(error)
    return {
      modelPublicId: candidate.model.publicId,
      provider: target.provider,
      channelId: target.channelId ?? null,
      deploymentId: target.deploymentId ?? null,
      status,
      latencyMs: this.elapsed(startedAt),
      errorCode: errorInfo?.code ?? null,
      errorMessage: errorInfo?.message ?? null,
    }
  }

  private errorInfo(error: unknown): { code: string; message: string } {
    if (error instanceof HttpException) {
      const response = error.getResponse()
      const message = typeof response === 'string'
        ? response
        : typeof response === 'object' && response !== null && 'message' in response
          ? String((response as { message: unknown }).message)
          : error.message
      return { code: `upstream_${error.getStatus()}`, message: message.slice(0, 300) }
    }
    return { code: 'provider_error', message: '模型供应商调用异常' }
  }

  private async safeRecord(input: RecordedInference): Promise<void> {
    try {
      await this.inference.record(input)
    } catch (error) {
      this.logger.error('记录模型调用时发生错误', error instanceof Error ? error.stack : undefined)
    }
  }

  private async safeRecordResult(target: ResolvedProviderTarget, errorCode?: string): Promise<void> {
    try {
      await this.deployments.recordResult(target, errorCode)
    } catch (error) {
      this.logger.warn(`更新供应商渠道健康状态失败: ${error instanceof Error ? error.message : 'unknown error'}`)
    }
  }

  private async acquireConcurrency(workspaceId: string): Promise<TrafficLease> {
    return this.traffic.acquireConcurrency(
      'inference-workspace',
      workspaceId,
      this.config.get<number>('INFERENCE_MAX_CONCURRENCY_PER_WORKSPACE', 20),
      this.config.get<number>('INFERENCE_CONCURRENCY_LEASE_MS', 600_000),
    )
  }

  private async consumeModelRate(workspaceId: string, candidate: WorkspaceModelEntity): Promise<void> {
    await this.traffic.consume('inference-rpm', `${workspaceId}:${candidate.model.publicId}`, candidate.rateLimitRpm, 60_000)
  }

  private async acquireChannelConcurrency(target: ResolvedProviderTarget): Promise<TrafficLease | undefined> {
    if (!target.channelId || !target.maxConcurrency) return undefined
    return this.traffic.acquireConcurrency(
      'provider-channel',
      target.channelId,
      target.maxConcurrency,
      Math.max(30_000, (target.timeoutMs ?? 60_000) + 5_000),
    )
  }

  private elapsed(startedAt: number): number {
    return Math.max(0, Math.round(performance.now() - startedAt))
  }

  private cost(inputTokens: number, outputTokens: number, inputPrice: number, outputPrice: number): number {
    return (inputTokens * inputPrice + outputTokens * outputPrice) / 1_000_000
  }
}
