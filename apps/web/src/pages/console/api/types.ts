export type { ApiKeyListResponse, CreateApiKeyResponse, DashboardOverviewResponse, ModelListResponse, RequestLogListResponse, RouteRule, RouteRuleListResponse, WorkspaceModelConfig, WorkspaceModelListResponse } from '@gateway/contracts'
import type { RouteMatchType, RouteStrategy } from '@gateway/contracts'

export interface CreateApiKeyInput { name: string }
export interface CreateWorkspaceModelInput {
  modelId: string
  alias?: string
  priority: number
  rateLimitRpm: number
  dailyBudgetCny?: number | null
  enabled: boolean
}
export type UpdateWorkspaceModelInput = Partial<Omit<CreateWorkspaceModelInput, 'modelId'>>
export interface CreateRouteRuleInput {
  name: string
  matchType: RouteMatchType
  strategy: RouteStrategy
  primaryModelId: string
  fallbackModelId?: string | null
  trafficPercent: number
  enabled: boolean
}
export type UpdateRouteRuleInput = Partial<CreateRouteRuleInput>
