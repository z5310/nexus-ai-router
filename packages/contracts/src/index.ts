export interface HealthResponse {
  status: 'ok' | 'degraded'
  service: string
  version: string
  timestamp: string
}

export interface OpenAIModel {
  id: string
  object: 'model'
  created: number
  owned_by: string
}

export interface OpenAIModelList {
  object: 'list'
  data: OpenAIModel[]
}

export type OpenAIChatRole = 'system' | 'user' | 'assistant'

export interface OpenAIChatMessage {
  role: OpenAIChatRole
  content: string
}

export interface OpenAIChatCompletionRequest {
  model: string
  messages: OpenAIChatMessage[]
  temperature?: number
  top_p?: number
  max_tokens?: number
  stream?: boolean
  user?: string
}

export interface OpenAIChatCompletionResponse {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: Array<{
    index: number
    message: OpenAIChatMessage
    finish_reason: string | null
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface OpenAIChatCompletionChunk {
  id: string
  object: 'chat.completion.chunk'
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: OpenAIChatRole
      content?: string
    }
    finish_reason: string | null
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  } | null
}

export type ModelType = 'text' | 'image' | 'video' | 'audio' | 'embedding'
export type ModelStatus = 'stable' | 'observing'
export type RankingMetric = 'overall' | 'coding' | 'cost' | 'speed'

export interface CatalogModel {
  id: string
  name: string
  slug: string
  owner: string
  provider: string
  type: ModelType
  descriptionKey: string
  inputPrice: number
  outputPrice: number | null
  priceUnit: 'million_tokens' | 'image' | 'second' | '10k_chars'
  latencyMs: number
  score: number
  codingScore: number
  costScore: number
  speedScore: number
  costPerTask: number
  context: string
  accent: string
  tagKey?: string
  capabilities: string[]
  status: ModelStatus
  trend: number | null
  featured: boolean
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ModelFacets {
  types: Partial<Record<ModelType, number>>
  providers: Record<string, number>
}

export interface ModelListResponse {
  data: CatalogModel[]
  pagination: PaginationMeta
  facets: ModelFacets
}

export interface AdminModel extends CatalogModel {
  enabled: boolean
  updatedAt: string
}

export interface AdminModelListResponse {
  data: AdminModel[]
  pagination: PaginationMeta
}

export interface AdminModelSummaryResponse {
  total: number
  enabled: number
  featured: number
  observing: number
  providers: number
}

export type ProviderEnvironment = 'development' | 'staging' | 'production'

export interface ProviderCredential {
  id: string
  provider: string
  environment: ProviderEnvironment
  name: string
  maskedKey: string
  enabled: boolean
  keyVersion: string
  rotatedAt: string
  createdAt: string
  updatedAt: string
}

export interface ProviderCredentialListResponse { data: ProviderCredential[] }

export type ApiKeyStatus = 'active' | 'revoked'

export interface ApiKeyRecord {
  id: string
  name: string
  maskedKey: string
  status: ApiKeyStatus
  lastUsedAt: string | null
  createdAt: string
}

export interface ApiKeyListResponse { data: ApiKeyRecord[] }
export interface CreateApiKeyResponse extends ApiKeyRecord { key: string }

export type WorkspaceStatus = 'active' | 'suspended'
export type WorkspaceRole = 'owner' | 'admin' | 'developer' | 'billing' | 'viewer'
export type WorkspaceMemberStatus = 'active' | 'invited'
export type ProjectStatus = 'active' | 'archived'

export interface WorkspaceContext {
  id: string
  name: string
  slug: string
  role: WorkspaceRole
  defaultCurrency: string
}

export interface WorkspaceListResponse { data: WorkspaceContext[] }
export interface WorkspaceIpPolicy { enabled: boolean; networks: string[] }

export interface WorkspaceMemberSummary {
  id: string
  name: string
  email: string
  role: WorkspaceRole
  status: WorkspaceMemberStatus
}
export interface WorkspaceMemberListResponse { data: WorkspaceMemberSummary[] }
export interface UpdateWorkspaceMemberInput { role: Exclude<WorkspaceRole, 'owner'> }

export interface WorkspaceModelConfig {
  id: string
  modelId: string
  name: string
  slug: string
  provider: string
  type: ModelType
  inputPrice: number
  status: ModelStatus
  alias: string | null
  priority: number
  rateLimitRpm: number
  dailyBudgetCny: number | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface WorkspaceModelListResponse { data: WorkspaceModelConfig[] }

export type RouteMatchType = 'all' | ModelType
export type RouteStrategy = 'priority' | 'lowest_cost' | 'lowest_latency'

export interface RouteRule {
  id: string
  name: string
  matchType: RouteMatchType
  strategy: RouteStrategy
  primaryModelId: string
  primaryModelName: string
  fallbackModelId: string | null
  fallbackModelName: string | null
  trafficPercent: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface RouteRuleListResponse { data: RouteRule[] }

export interface RankingEntry extends CatalogModel {
  rank: number
  metric: RankingMetric
  metricScore: number
  calls7d: number
  usageShare: number
  weeklyGrowth: number | null
}

export interface RankingListResponse {
  data: RankingEntry[]
  metric: RankingMetric
  updatedAt: string
}

export interface DashboardStat {
  value: number
  changePercent: number
  direction: 'up' | 'down'
}

export interface UsagePoint {
  timestamp: string
  requestCount: number
  tokenCount: number
  costCny: number
  averageLatencyMs: number
}

export interface RequestLogItem {
  id: string
  requestId: string
  modelId: string
  modelName: string
  status: 'success' | 'failed'
  latencyMs: number
  tokenCount: number
  costCny: number
  createdAt: string
}

export interface DashboardOverviewResponse {
  stats: {
    requests: DashboardStat
    tokens: DashboardStat
    latency: DashboardStat
    spending: DashboardStat
  }
  balance: {
    availableCny: number
    usedThisMonthCny: number
    usagePercent: number
  } | null
  trend: UsagePoint[]
  recentRequests: RequestLogItem[]
}

export interface RequestLogListResponse {
  data: RequestLogItem[]
}

export interface InferenceAttemptItem {
  attemptNumber: number
  modelId: string
  provider: string
  status: 'success' | 'failed' | 'cancelled'
  latencyMs: number
  errorCode: string | null
  errorMessage: string | null
  createdAt: string
}

export interface RequestLogDetail extends RequestLogItem {
  requestedModelId: string
  routeRuleId: string | null
  attemptCount: number
  firstTokenLatencyMs: number | null
  errorCode: string | null
  inputTokens: number
  outputTokens: number
  attempts: InferenceAttemptItem[]
}

export type UserRole = 'admin' | 'manager' | 'viewer'
export type UserStatus = 'active' | 'suspended' | 'invited'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  accessToken: string
  expiresIn: number
  user: AuthUser
}

export interface AuthSession {
  id: string
  current: boolean
  userAgent: string | null
  ipAddress: string | null
  lastSeenAt: string
  createdAt: string
  expiresAt: string
}

export interface AuthSessionListResponse {
  data: AuthSession[]
}

export interface PasswordResetRequestResponse {
  accepted: true
  expiresIn: number
  debugToken?: string
}

export interface UserListResponse {
  data: AuthUser[]
  pagination: PaginationMeta
}

export interface UserSummaryResponse {
  total: number
  active: number
  suspended: number
  invited: number
  admins: number
}
