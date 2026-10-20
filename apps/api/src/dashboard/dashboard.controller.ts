import { Controller, Get, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { DashboardOverviewResponse, RequestLogListResponse } from '@gateway/contracts'
import { DashboardService } from './dashboard.service'
import { ListRequestLogsQuery } from './dto/list-request-logs.query'

@ApiTags('dashboard')
@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get usage totals, hourly trend, balance, and recent requests' })
  overview(): Promise<DashboardOverviewResponse> {
    return this.dashboard.overview()
  }

  @Get('requests')
  @ApiOperation({ summary: 'Search recent gateway requests' })
  requests(@Query() query: ListRequestLogsQuery): Promise<RequestLogListResponse> {
    return this.dashboard.requests(query)
  }
}
