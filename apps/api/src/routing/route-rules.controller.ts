import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiHeader, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { RouteRule, RouteRuleListResponse } from '@gateway/contracts'
import { JwtAuthGuard } from '../identity/auth.guard'
import { WorkspaceContextGuard, type WorkspaceRequest } from '../workspaces/workspace-context.guard'
import { RequireWorkspacePermission } from '../workspaces/workspace-permissions'
import { CreateRouteRuleDto, UpdateRouteRuleDto } from './dto/route-rules.dto'
import { RouteRulesService } from './route-rules.service'

@ApiTags('route-rules')
@ApiBearerAuth()
@ApiHeader({ name: 'x-workspace-id', required: false, description: 'Target workspace; defaults to the first active membership' })
@UseGuards(JwtAuthGuard, WorkspaceContextGuard)
@Controller('api/console/routes')
export class RouteRulesController {
  constructor(private readonly rules: RouteRulesService) {}

  @Get()
  @RequireWorkspacePermission('routes:read')
  @ApiOperation({ summary: 'List route rules for the current account workspace' })
  list(@Req() request: WorkspaceRequest): Promise<RouteRuleListResponse> { return this.rules.list(request.workspace.id) }

  @Post()
  @RequireWorkspacePermission('routes:manage')
  @ApiOperation({ summary: 'Create a model route rule' })
  create(@Req() request: WorkspaceRequest, @Body() input: CreateRouteRuleDto): Promise<RouteRule> { return this.rules.create(request.workspace.id, request.user.sub, input) }

  @Patch(':id')
  @RequireWorkspacePermission('routes:manage')
  @ApiOperation({ summary: 'Update a model route rule' })
  update(@Req() request: WorkspaceRequest, @Param('id') id: string, @Body() input: UpdateRouteRuleDto): Promise<RouteRule> { return this.rules.update(request.workspace.id, id, input) }

  @Delete(':id')
  @RequireWorkspacePermission('routes:manage')
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiOperation({ summary: 'Delete a model route rule' })
  remove(@Req() request: WorkspaceRequest, @Param('id') id: string): Promise<void> { return this.rules.remove(request.workspace.id, id) }
}
