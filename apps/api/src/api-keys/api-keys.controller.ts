import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiHeader, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { ApiKeyListResponse, CreateApiKeyResponse } from '@gateway/contracts'
import { JwtAuthGuard } from '../identity/auth.guard'
import { WorkspaceContextGuard, type WorkspaceRequest } from '../workspaces/workspace-context.guard'
import { ApiKeysService } from './api-keys.service'
import { CreateApiKeyDto } from './dto/api-keys.dto'

@ApiTags('api-keys')
@ApiBearerAuth()
@ApiHeader({ name: 'x-workspace-id', required: false, description: 'Target workspace; defaults to the first active membership' })
@UseGuards(JwtAuthGuard, WorkspaceContextGuard)
@Controller('api/keys')
export class ApiKeysController {
  constructor(private readonly keys: ApiKeysService) {}

  @Get()
  @ApiOperation({ summary: 'List API keys owned by the current workspace' })
  list(@Req() request: WorkspaceRequest): Promise<ApiKeyListResponse> { return this.keys.list(request.workspace.id) }

  @Post()
  @ApiOperation({ summary: 'Create a named API key; the plaintext key is returned once' })
  create(@Req() request: WorkspaceRequest, @Body() input: CreateApiKeyDto): Promise<CreateApiKeyResponse> { return this.keys.create(request.workspace.id, request.user.sub, input.name) }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiOperation({ summary: 'Revoke an API key owned by the current workspace' })
  revoke(@Req() request: WorkspaceRequest, @Param('id') id: string): Promise<void> { return this.keys.revoke(request.workspace.id, id) }
}
