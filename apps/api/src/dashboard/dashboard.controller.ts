import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { DashboardOverviewResponse, RequestLogListResponse } from '@gateway/contracts'
import { DashboardService } from './dashboard.service'
import { ListRequestLogsQuery } from './dto/list-request-logs.query'
import { JwtAuthGuard, type AuthenticatedRequest } from '../identity/auth.guard'

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get usage totals, hourly trend, balance, and recent requests' })
  overview(@Req() request: AuthenticatedRequest): Promise<DashboardOverviewResponse> {
    return this.dashboard.overview(request.user.sub)
  }

  @Get('requests')
  @ApiOperation({ summary: 'Search recent gateway requests' })
  requests(@Req() request: AuthenticatedRequest, @Query() query: ListRequestLogsQuery): Promise<RequestLogListResponse> {
    return this.dashboard.requests(request.user.sub, query)
  }
}
