import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiHeader, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { WorkspaceModelConfig, WorkspaceModelListResponse } from '@gateway/contracts'
import { JwtAuthGuard } from '../identity/auth.guard'
import { WorkspaceContextGuard, type WorkspaceRequest } from '../workspaces/workspace-context.guard'
import { CreateWorkspaceModelDto, UpdateWorkspaceModelDto } from './dto/workspace-models.dto'
import { WorkspaceModelsService } from './workspace-models.service'

@ApiTags('workspace-models')
@ApiBearerAuth()
@ApiHeader({ name: 'x-workspace-id', required: false, description: 'Target workspace; defaults to the first active membership' })
@UseGuards(JwtAuthGuard, WorkspaceContextGuard)
@Controller('api/console/models')
export class WorkspaceModelsController {
  constructor(private readonly models: WorkspaceModelsService) {}

  @Get()
  @ApiOperation({ summary: 'List model configurations for the current account workspace' })
  list(@Req() request: WorkspaceRequest): Promise<WorkspaceModelListResponse> { return this.models.list(request.workspace.id) }

  @Post()
  @ApiOperation({ summary: 'Add a catalog model to the current account workspace' })
  create(@Req() request: WorkspaceRequest, @Body() input: CreateWorkspaceModelDto): Promise<WorkspaceModelConfig> { return this.models.create(request.workspace.id, request.user.sub, input) }

  @Patch(':id')
  @ApiOperation({ summary: 'Update workspace-specific model routing limits' })
  update(@Req() request: WorkspaceRequest, @Param('id') id: string, @Body() input: UpdateWorkspaceModelDto): Promise<WorkspaceModelConfig> { return this.models.update(request.workspace.id, id, input) }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiOperation({ summary: 'Remove a model from the current account workspace' })
  remove(@Req() request: WorkspaceRequest, @Param('id') id: string): Promise<void> { return this.models.remove(request.workspace.id, id) }
}
