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

export interface RankingEntry extends CatalogModel {
  rank: number
  metric: RankingMetric
  metricScore: number
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
  }
  trend: UsagePoint[]
  recentRequests: RequestLogItem[]
}

export interface RequestLogListResponse {
  data: RequestLogItem[]
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
