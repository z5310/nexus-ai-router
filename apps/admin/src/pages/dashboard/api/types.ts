export type { AdminModel, AdminModelListResponse, AdminModelSummaryResponse, ModelDeployment, ModelDeploymentListResponse, ProviderChannel, ProviderChannelListResponse, ProviderCredential, ProviderCredentialListResponse, UserListResponse, UserSummaryResponse } from '@gateway/contracts'
export interface AdminListQuery { query?: string; page: number; pageSize: number }
export interface CreateProviderChannelInput { name: string; provider: string; environment: 'development' | 'staging' | 'production'; credentialId: string; region: string; timeoutMs: number; maxConcurrency: number; enabled: boolean }
export interface CreateModelDeploymentInput { modelId: string; channelId: string; upstreamModelId: string; priority: number; weight: number; enabled: boolean }
export interface CreateProviderCredentialInput { name: string; provider: string; environment: 'development' | 'staging' | 'production'; apiKey: string; enabled: boolean }
