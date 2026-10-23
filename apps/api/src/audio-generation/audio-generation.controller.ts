import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../identity/auth.guard'
import { WorkspaceContextGuard, type WorkspaceRequest } from '../workspaces/workspace-context.guard'
import { RequireWorkspacePermission } from '../workspaces/workspace-permissions'
import { CreateAudioGenerationDto, ListAudioGenerationTasksQuery } from './audio-generation.dto'
import { AudioGenerationService } from './audio-generation.service'

@Controller('api/console/audio-generations')
@UseGuards(JwtAuthGuard, WorkspaceContextGuard)
@RequireWorkspacePermission('inference:execute')
export class AudioGenerationController {
  constructor(private readonly service: AudioGenerationService) {}

  @Get()
  list(@Query() query: ListAudioGenerationTasksQuery, @Req() request: WorkspaceRequest) {
    return this.service.list(request.workspace.id, request.user.sub, query)
  }

  @Get(':id')
  detail(@Param('id') id: string, @Req() request: WorkspaceRequest) {
    return this.service.detail(id, request.workspace.id, request.user.sub)
  }

  @Post()
  @HttpCode(202)
  create(@Body() input: CreateAudioGenerationDto, @Req() request: WorkspaceRequest) {
    return this.service.create(request.workspace.id, request.user.sub, input)
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@Param('id') id: string, @Req() request: WorkspaceRequest) {
    return this.service.cancel(id, request.workspace.id, request.user.sub)
  }
}
