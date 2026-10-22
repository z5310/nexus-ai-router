export type { ApiKeyListResponse, CreateApiKeyResponse, DashboardOverviewResponse, ModelListResponse, RequestLogListResponse, WorkspaceModelConfig, WorkspaceModelListResponse } from '@gateway/contracts'

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
