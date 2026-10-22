import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { WorkspaceModelConfig, WorkspaceModelListResponse } from '@gateway/contracts'
import { JwtAuthGuard, type AuthenticatedRequest } from '../identity/auth.guard'
import { CreateWorkspaceModelDto, UpdateWorkspaceModelDto } from './dto/workspace-models.dto'
import { WorkspaceModelsService } from './workspace-models.service'

@ApiTags('workspace-models')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/console/models')
export class WorkspaceModelsController {
  constructor(private readonly models: WorkspaceModelsService) {}

  @Get()
  @ApiOperation({ summary: 'List model configurations for the current account workspace' })
  list(@Req() request: AuthenticatedRequest): Promise<WorkspaceModelListResponse> { return this.models.list(request.user.sub) }

  @Post()
  @ApiOperation({ summary: 'Add a catalog model to the current account workspace' })
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateWorkspaceModelDto): Promise<WorkspaceModelConfig> { return this.models.create(request.user.sub, input) }

  @Patch(':id')
  @ApiOperation({ summary: 'Update workspace-specific model routing limits' })
  update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: UpdateWorkspaceModelDto): Promise<WorkspaceModelConfig> { return this.models.update(request.user.sub, id, input) }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiOperation({ summary: 'Remove a model from the current account workspace' })
  remove(@Req() request: AuthenticatedRequest, @Param('id') id: string): Promise<void> { return this.models.remove(request.user.sub, id) }
}
