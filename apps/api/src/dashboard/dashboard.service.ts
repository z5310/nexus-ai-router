import { Injectable } from '@nestjs/common'
import type { DashboardOverviewResponse, DashboardStat, RequestLogItem, RequestLogListResponse } from '@gateway/contracts'
import { DashboardRepository, type RequestLogRow } from './dashboard.repository'
import type { ListRequestLogsQuery } from './dto/list-request-logs.query'

@Injectable()
export class DashboardService {
  constructor(private readonly dashboard: DashboardRepository) {}

  async overview(workspaceId: string): Promise<DashboardOverviewResponse> {
    const [trend, requestRows] = await Promise.all([
      this.dashboard.usageTrend(workspaceId),
      this.dashboard.recentRequests(workspaceId, { limit: 8 }),
    ])
    const requests = trend.reduce((sum, point) => sum + point.requestCount, 0)
    const tokens = trend.reduce((sum, point) => sum + Number(point.tokenCount), 0)
    const spending = trend.reduce((sum, point) => sum + Number(point.costCny), 0)
    const weightedLatency = trend.reduce((sum, point) => sum + point.averageLatencyMs * point.requestCount, 0)
    const latency = requests > 0 ? weightedLatency / requests : 0

    return {
      stats: {
        requests: this.stat(requests, 18.4),
        tokens: this.stat(tokens, 12.1),
        latency: this.stat(Math.round(latency), -8.2),
        spending: this.stat(Number(spending.toFixed(2)), 6.7),
      },
      balance: {
        availableCny: 328.42,
        usedThisMonthCny: 171.58,
        usagePercent: 34,
      },
      trend: trend.map((point) => ({
        timestamp: point.bucketStart.toISOString(),
        requestCount: point.requestCount,
        tokenCount: Number(point.tokenCount),
        costCny: Number(point.costCny),
        averageLatencyMs: point.averageLatencyMs,
      })),
      recentRequests: requestRows.map((row) => this.mapRequest(row)),
    }
  }

  async requests(workspaceId: string, query: ListRequestLogsQuery): Promise<RequestLogListResponse> {
    const rows = await this.dashboard.recentRequests(workspaceId, query)
    return { data: rows.map((row) => this.mapRequest(row)) }
  }

  private stat(value: number, changePercent: number): DashboardStat {
    return { value, changePercent, direction: changePercent >= 0 ? 'up' : 'down' }
  }

  private mapRequest(row: RequestLogRow): RequestLogItem {
    return {
      id: row.id,
      requestId: row.requestId,
      modelId: row.modelPublicId,
      modelName: row.modelName,
      status: row.status,
      latencyMs: Number(row.latencyMs),
      tokenCount: Number(row.inputTokens) + Number(row.outputTokens),
      costCny: Number(row.costCny),
      createdAt: new Date(row.createdAt).toISOString(),
    }
  }
}
