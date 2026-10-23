import { Injectable, NotFoundException } from '@nestjs/common'
import type { DashboardOverviewResponse, DashboardStat, RequestLogDetail, RequestLogItem, RequestLogListResponse } from '@gateway/contracts'
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
        requests: this.stat(requests),
        tokens: this.stat(tokens),
        latency: this.stat(Math.round(latency)),
        spending: this.stat(Number(spending.toFixed(2))),
      },
      balance: null,
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

  async requestDetail(workspaceId: string, requestId: string): Promise<RequestLogDetail> {
    const result = await this.dashboard.requestDetail(workspaceId, requestId)
    if (!result) throw new NotFoundException('请求记录不存在')
    const item = this.mapRequest(result.request)
    return {
      ...item,
      priceSnapshot: result.request.priceSnapshot ?? null,
      requestedModelId: result.request.requestedModelPublicId,
      routeRuleId: result.request.routeRuleId,
      attemptCount: Number(result.request.attemptCount),
      firstTokenLatencyMs: result.request.firstTokenLatencyMs === null ? null : Number(result.request.firstTokenLatencyMs),
      errorCode: result.request.errorCode,
      inputTokens: Number(result.request.inputTokens),
      outputTokens: Number(result.request.outputTokens),
      attempts: result.attempts.map((attempt) => ({
        attemptNumber: attempt.attemptNumber,
        modelId: attempt.modelPublicId,
        provider: attempt.provider,
        channelId: attempt.channelId,
        deploymentId: attempt.deploymentId,
        status: attempt.status,
        latencyMs: attempt.latencyMs,
        errorCode: attempt.errorCode,
        errorMessage: attempt.errorMessage,
        createdAt: attempt.createdAt.toISOString(),
      })),
    }
  }

  private stat(value: number): DashboardStat {
    return { value, changePercent: 0, direction: 'up' }
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
