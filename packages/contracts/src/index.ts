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


export type AudioResponseFormat = 'mp3' | 'wav' | 'flac'
export type AudioGenerationTaskStatus = 'queued' | 'processing' | 'succeeded' | 'failed' | 'cancelled'

export interface AudioGenerationInput {
  model: string
  prompt: string
  voice: string
  instruction?: string
  language?: string
  speech_rate: number
  pitch: number
  volume: number
  sample_rate: number
  bitrate: number
  response_format: AudioResponseFormat
}

export interface AudioGenerationTask {
  id: string
  model: string
  modelName: string
  status: AudioGenerationTaskStatus
  promptPreview: string
  voice: string
  instruction: string | null
  language: string | null
  speechRate: number
  pitch: number
  volume: number
  sampleRate: number
  bitrate: number
  responseFormat: AudioResponseFormat
  estimatedCostCny: number
  settledCostCny: number | null
  resultUrl: string | null
  resultExpiresAt: string | null
  durationMs: number | null
  errorCode: string | null
  errorMessage: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

export interface AudioGenerationTaskListResponse { data: AudioGenerationTask[] }

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
  originalInputPrice: number
  originalOutputPrice: number | null
  discountPercent: number
  priceEffectiveFrom: string
  priceUnit: 'million_tokens' | 'image' | 'second' | '10k_chars'
  latencyMs: number
  score: number
  codingScore: number
  costScore: number
  speedScore: number
  costPerTask: number
  context: string
  accent: string
  tags: string[]
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

export interface ModelPriceVersion {
  id: string
  modelId: string
  inputPrice: number
  outputPrice: number | null
  originalInputPrice: number
  originalOutputPrice: number | null
  discountPercent: number
  priceUnit: CatalogModel['priceUnit']
  effectiveFrom: string
  effectiveTo: string | null
  createdAt: string
}

export interface ModelPricingResponse {
  modelId: string
  modelName: string
  modelSlug: string
  inputPrice: number
  outputPrice: number | null
  originalInputPrice: number
  originalOutputPrice: number | null
  discountPercent: number
  priceUnit: CatalogModel['priceUnit']
  effectiveFrom: string
  versions: ModelPriceVersion[]
}

export interface UpdateModelPricingInput {
  originalInputPrice: number
  originalOutputPrice: number | null
  discountPercent: number
  priceUnit: CatalogModel['priceUnit']
}

export type ProviderEnvironment = 'development' | 'staging' | 'production'

export type ProviderProtocol = 'openai_compatible' | 'anthropic' | 'google' | 'custom'

export interface ProviderDefinition {
  id: string
  code: string
  name: string
  protocol: ProviderProtocol
  baseUrl: string | null
  docsUrl: string | null
  capabilities: ModelType[]
  enabled: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ProviderDefinitionListResponse { data: ProviderDefinition[] }

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

export type ProviderChannelHealth = 'unknown' | 'healthy' | 'degraded' | 'unhealthy'

export interface ProviderChannel {
  id: string
  name: string
  provider: string
  environment: ProviderEnvironment
  credentialId: string
  credentialName: string
  credentialMaskedKey: string
  region: string
  timeoutMs: number
  maxConcurrency: number
  enabled: boolean
  healthStatus: ProviderChannelHealth
  consecutiveFailures: number
  lastCheckedAt: string | null
  lastSuccessAt: string | null
  lastFailureAt: string | null
  lastErrorCode: string | null
  nextProbeAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ProviderChannelListResponse { data: ProviderChannel[] }

export interface ModelDeployment {
  id: string
  modelId: string
  modelName: string
  modelPublicId: string
  channelId: string
  channelName: string
  provider: string
  region: string
  healthStatus: ProviderChannelHealth
  upstreamModelId: string
  priority: number
  weight: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface ModelDeploymentListResponse { data: ModelDeployment[] }

export interface ProviderDeploymentTestResult {
  deploymentId: string
  channelId: string
  provider: string
  upstreamModelId: string
  latencyMs: number
  checkedAt: string
}

export interface ProviderAcceptanceStep {
  latencyMs: number
  inputTokens?: number
  outputTokens?: number
}

export interface ProviderDeploymentAcceptanceResult {
  deploymentId: string
  channelId: string
  provider: string
  upstreamModelId: string
  checkedAt: string
  modelDiscovery: ProviderAcceptanceStep
  jsonCompletion: ProviderAcceptanceStep
  streamCompletion: ProviderAcceptanceStep & { firstTokenLatencyMs: number }
  cancellation: ProviderAcceptanceStep & { propagated: true }
}

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

export type WorkspaceInvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired'
export interface WorkspaceInvitation {
  id: string
  workspaceId: string
  email: string
  role: Exclude<WorkspaceRole, 'owner'>
  status: WorkspaceInvitationStatus
  invitedByUserId: string
  acceptedByUserId: string | null
  expiresAt: string
  acceptedAt: string | null
  revokedAt: string | null
  lastSentAt: string
  createdAt: string
}
export interface WorkspaceInvitationListResponse { data: WorkspaceInvitation[] }
export interface CreateWorkspaceInvitationInput {
  email: string
  role: Exclude<WorkspaceRole, 'owner'>
}
export interface WorkspaceInvitationSecret extends WorkspaceInvitation { token: string }
export interface AcceptWorkspaceInvitationResponse { workspace: WorkspaceContext }
export interface TransferWorkspaceOwnershipInput { memberId: string }
export interface TransferWorkspaceOwnershipResponse {
  workspaceId: string
  previousOwnerMemberId: string
  ownerMemberId: string
}

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
  scoreSource: RankingScoreSource
}

export interface RankingScoreSource {
  code: string
  name: string
  url: string | null
  sampledAt: string
  verified: boolean
  external: boolean
}

export interface RankingListResponse {
  data: RankingEntry[]
  metric: RankingMetric
  updatedAt: string
  sources: RankingScoreSource[]
}

export type RankingSourceAdapter = 'huggingface'

export interface RankingSource {
  id: string
  code: string
  name: string
  adapter: RankingSourceAdapter
  datasetId: string
  metric: RankingMetric
  scoreMultiplier: number
  priority: number
  enabled: boolean
  attributionLabel: string
  sourceUrl: string
  lastSyncedAt: string | null
  lastSuccessAt: string | null
  lastError: string | null
  mappingCount: number
  snapshotCount: number
  createdAt: string
  updatedAt: string
}

export interface RankingSourceListResponse { data: RankingSource[] }

export interface RankingSourceSnapshot {
  mappingId: string | null
  externalModelId: string
  rank: number
  rawScore: number
  normalizedScore: number
  verified: boolean
  author: string | null
  capturedAt: string
  mappedModelId: string | null
  mappedModelName: string | null
}

export interface RankingSourceDetailResponse {
  source: RankingSource
  snapshots: RankingSourceSnapshot[]
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
  channelId: string | null
  deploymentId: string | null
  status: 'success' | 'failed' | 'cancelled'
  latencyMs: number
  errorCode: string | null
  errorMessage: string | null
  createdAt: string
}

export interface RequestPriceSnapshot {
  versionId: string | null
  modelId: string
  currency: 'CNY'
  priceUnit: 'million_tokens' | 'image' | 'second' | '10k_chars'
  inputPrice: string
  outputPrice: string | null
  originalInputPrice: string
  originalOutputPrice: string | null
  discountPercent: string
  effectiveFrom: string
}

export interface BillingBalance {
  currency: 'CNY'
  available: string
  reserved: string
}

export interface BillingLedgerEntry {
  amount: string
  id: string
  kind: 'grant' | 'reserve' | 'settle' | 'release'
  reference: string
  availableDelta: string
  reservedDelta: string
  availableAfter: string
  reservedAfter: string
  createdAt: string
}

export interface BillingLedgerResponse {
  data: BillingLedgerEntry[]
  nextCursor: string | null
}

export interface BillingReservation {
  requestId: string
  status: 'held' | 'settled' | 'released'
  reserved: string
  settled: string | null
}

export interface BillingPendingListResponse {
  data: Array<{
    reference: string
    requestId: string
    reserved: string
    actual: string | null
    outcome: 'prepared' | 'dispatched' | 'settle' | 'release' | 'review'
    reviewReason: string | null
    updatedAt: string
  }>
}

export interface BillingStatus { chatEnabled: boolean; currency: 'CNY' }
export interface BillingAdminWorkspace {
  id: string; name: string; slug: string; chatEnabled: boolean
  balance: BillingBalance
}
export interface BillingAdminWorkspaceList { data: BillingAdminWorkspace[]; page: number; total: number }
export interface BillingAdminActionInput {
  operationId: string; reason: string; evidence: string
}
export interface BillingAdminGrantInput extends BillingAdminActionInput { amount: string }
export interface BillingAdminResolutionInput extends BillingAdminActionInput {
  action: 'settle' | 'release'; inputTokens?: number; outputTokens?: number
}
export interface BillingAdminActionResult {
  operationId: string; workspaceId: string; balance: BillingBalance; reservation?: BillingReservation
}
export interface BillingAdminAuditItem {
  operationId: string; kind: 'grant' | 'manual_settle' | 'manual_release'
  actorUserId: string; actorName: string; reason: string; evidence: string
  reference: string | null; beforeBalance: BillingBalance; result: BillingAdminActionResult; createdAt: string
}
export interface BillingAdminDetail {
  workspace: BillingAdminWorkspace
  pending: BillingPendingListResponse
  ledger: BillingLedgerResponse
  audit: BillingAdminAuditItem[]
}
export interface BillingResolutionPreview {
  action: 'settle' | 'release'; amount: string; reserved: string; availableAfter: string; sufficient: boolean
}

export interface RequestLogDetail extends RequestLogItem {
  priceSnapshot: RequestPriceSnapshot | null
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


export type AuditOutcome = 'success' | 'failure'

export interface AuditLogItem {
  id: string
  actorUserId: string | null
  actorEmail: string | null
  action: string
  resourceType: string
  resourceId: string | null
  outcome: AuditOutcome
  metadata: Record<string, unknown>
  ipAddress: string | null
  userAgent: string | null
  requestId: string | null
  createdAt: string
}

export interface AuditLogListResponse {
  data: AuditLogItem[]
  pagination: PaginationMeta
}

export type AdminSessionStatus = 'active' | 'revoked' | 'expired'

export interface AdminSessionItem {
  id: string
  user: Pick<AuthUser, 'id' | 'name' | 'email' | 'role' | 'status'>
  status: AdminSessionStatus
  current: boolean
  userAgent: string | null
  ipAddress: string | null
  lastSeenAt: string
  createdAt: string
  expiresAt: string
  revokedAt: string | null
}

export interface AdminSessionListResponse {
  data: AdminSessionItem[]
  pagination: PaginationMeta
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
