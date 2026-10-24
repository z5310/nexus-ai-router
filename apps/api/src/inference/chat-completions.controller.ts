import { BadRequestException, Body, Controller, Headers, HttpCode, Post, Req, Res, UseFilters, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { OpenAIChatCompletionResponse } from '@gateway/contracts'
import type { FastifyReply } from 'fastify'
import { ApiKeyAuthGuard, type ApiKeyRequest } from './api-key-auth.guard'
import { ChatCompletionDto } from './dto/chat-completion.dto'
import { InferenceService, type InferenceChatStream } from './inference.service'
import { OpenAIErrorFilter } from './openai-error.filter'
import { InferenceIdempotencyService } from './inference-idempotency.service'

@ApiTags('openai-compatible')
@ApiBearerAuth()
@UseGuards(ApiKeyAuthGuard)
@UseFilters(OpenAIErrorFilter)
@Controller('v1/chat/completions')
export class ChatCompletionsController {
  constructor(private readonly inference: InferenceService, private readonly idempotency: InferenceIdempotencyService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Create an OpenAI-compatible chat completion with optional SSE streaming' })
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: '非流式请求的 8–128 位幂等键，结果保留 24 小时' })
  async create(
    @Req() request: ApiKeyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Body() input: ChatCompletionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<OpenAIChatCompletionResponse | void> {
    reply.header('x-request-id', request.id)
    if (input.stream && idempotencyKey) throw new BadRequestException('流式请求暂不支持 Idempotency-Key')
    if (input.stream) return this.stream(request, reply, input)
    if (idempotencyKey) {
      const result = await this.idempotency.execute(request.apiKey.workspaceId, idempotencyKey, input, request.id, (requestId) => this.inference.chat(input, request.apiKey, requestId))
      reply.header('x-request-id', result.requestId)
      if (result.replayed) reply.header('idempotency-replayed', 'true')
      return result.response
    }
    return this.inference.chat(input, request.apiKey, request.id)
  }

  private async stream(request: ApiKeyRequest, reply: FastifyReply, input: ChatCompletionDto): Promise<void> {
    const client = new AbortController()
    const abort = () => client.abort()
    request.raw.once('aborted', abort)
    reply.raw.once('close', abort)

    let stream: InferenceChatStream
    try {
      stream = await this.inference.streamChat(input, request.apiKey, client.signal, request.id)
    } catch (error) {
      request.raw.off('aborted', abort)
      reply.raw.off('close', abort)
      throw error
    }
    reply.hijack()
    reply.raw.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
      'x-request-id': request.id,
    })

    try {
      for await (const chunk of stream.chunks) {
        if (client.signal.aborted || reply.raw.destroyed) break
        await this.writeSse(reply, `data: ${JSON.stringify(chunk)}\n\n`, client.signal)
      }
      if (!client.signal.aborted && !reply.raw.destroyed) await this.writeSse(reply, 'data: [DONE]\n\n', client.signal)
    } catch {
      if (!client.signal.aborted && !reply.raw.destroyed) {
        await this.writeSse(reply, `data: ${JSON.stringify({ error: { message: '上游模型流式响应中断', type: 'api_error', param: null, code: 'stream_error' }, request_id: request.id })}\n\n`, client.signal)
        await this.writeSse(reply, 'data: [DONE]\n\n', client.signal)
      }
    } finally {
      stream.cancel()
      request.raw.off('aborted', abort)
      reply.raw.off('close', abort)
      if (!reply.raw.destroyed) reply.raw.end()
    }
  }

  private async writeSse(reply: FastifyReply, frame: string, signal: AbortSignal): Promise<void> {
    if (reply.raw.write(frame)) return
    await new Promise<void>((resolve) => {
      const done = () => {
        reply.raw.off('drain', done)
        signal.removeEventListener('abort', done)
        resolve()
      }
      reply.raw.once('drain', done)
      signal.addEventListener('abort', done, { once: true })
    })
  }
}
