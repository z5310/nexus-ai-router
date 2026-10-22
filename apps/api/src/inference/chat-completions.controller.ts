import { Body, Controller, HttpCode, Post, Req, Res, UseFilters, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { OpenAIChatCompletionResponse } from '@gateway/contracts'
import type { FastifyReply } from 'fastify'
import { ApiKeyAuthGuard, type ApiKeyRequest } from './api-key-auth.guard'
import { ChatCompletionDto } from './dto/chat-completion.dto'
import { InferenceService, type InferenceChatStream } from './inference.service'
import { OpenAIErrorFilter } from './openai-error.filter'

@ApiTags('openai-compatible')
@ApiBearerAuth()
@UseGuards(ApiKeyAuthGuard)
@UseFilters(OpenAIErrorFilter)
@Controller('v1/chat/completions')
export class ChatCompletionsController {
  constructor(private readonly inference: InferenceService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Create an OpenAI-compatible chat completion with optional SSE streaming' })
  async create(
    @Req() request: ApiKeyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Body() input: ChatCompletionDto,
  ): Promise<OpenAIChatCompletionResponse | void> {
    if (input.stream) return this.stream(request, reply, input)
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
