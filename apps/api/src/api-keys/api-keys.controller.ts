import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { ApiKeyListResponse, CreateApiKeyResponse } from '@gateway/contracts'
import { JwtAuthGuard, type AuthenticatedRequest } from '../identity/auth.guard'
import { ApiKeysService } from './api-keys.service'
import { CreateApiKeyDto } from './dto/api-keys.dto'

@ApiTags('api-keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/keys')
export class ApiKeysController {
  constructor(private readonly keys: ApiKeysService) {}

  @Get()
  @ApiOperation({ summary: 'List API keys owned by the current account' })
  list(@Req() request: AuthenticatedRequest): Promise<ApiKeyListResponse> { return this.keys.list(request.user.sub) }

  @Post()
  @ApiOperation({ summary: 'Create a named API key; the plaintext key is returned once' })
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateApiKeyDto): Promise<CreateApiKeyResponse> { return this.keys.create(request.user.sub, input.name) }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiOperation({ summary: 'Revoke an API key owned by the current account' })
  revoke(@Req() request: AuthenticatedRequest, @Param('id') id: string): Promise<void> { return this.keys.revoke(request.user.sub, id) }
}
