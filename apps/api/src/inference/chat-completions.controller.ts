import { Body, Controller, HttpCode, Post, Req, UseFilters, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { OpenAIChatCompletionResponse } from '@gateway/contracts'
import { ApiKeyAuthGuard, type ApiKeyRequest } from './api-key-auth.guard'
import { ChatCompletionDto } from './dto/chat-completion.dto'
import { InferenceService } from './inference.service'
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
  @ApiOperation({ summary: 'Create a non-streaming OpenAI-compatible chat completion' })
  create(@Req() request: ApiKeyRequest, @Body() input: ChatCompletionDto): Promise<OpenAIChatCompletionResponse> {
    return this.inference.chat(input, request.apiKey, request.id)
  }
}
