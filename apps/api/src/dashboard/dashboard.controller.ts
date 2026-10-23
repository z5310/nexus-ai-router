import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { DashboardOverviewResponse, RequestLogListResponse } from '@gateway/contracts'
import { DashboardService } from './dashboard.service'
import { ListRequestLogsQuery } from './dto/list-request-logs.query'
import { JwtAuthGuard } from '../identity/auth.guard'
import { WorkspaceContextGuard, type WorkspaceRequest } from '../workspaces/workspace-context.guard'
import { RequireWorkspacePermission } from '../workspaces/workspace-permissions'

@ApiTags('dashboard')
@ApiBearerAuth()
@ApiHeader({ name: 'x-workspace-id', required: false, description: 'Target workspace; defaults to the first active membership' })
@UseGuards(JwtAuthGuard, WorkspaceContextGuard)
@RequireWorkspacePermission('usage:read')
@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get usage totals, hourly trend, balance, and recent requests' })
  overview(@Req() request: WorkspaceRequest): Promise<DashboardOverviewResponse> {
    return this.dashboard.overview(request.workspace.id)
  }

  @Get('requests')
  @ApiOperation({ summary: 'Search recent gateway requests' })
  requests(@Req() request: WorkspaceRequest, @Query() query: ListRequestLogsQuery): Promise<RequestLogListResponse> {
    return this.dashboard.requests(request.workspace.id, query)
  }
}
