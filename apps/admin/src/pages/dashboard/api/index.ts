import type { AdminModel, AdminModelListResponse, AdminModelSummaryResponse, ModelDeployment, ModelDeploymentListResponse, ModelPricingResponse, ProviderChannel, ProviderChannelListResponse, ProviderCredentialListResponse, UpdateModelPricingInput, UserListResponse, UserSummaryResponse } from '@gateway/contracts'
import { request } from '../../../lib/http'
import { adminEndpoints } from './endpoints'
import type { AdminListQuery, CreateModelDeploymentInput, CreateProviderChannelInput, CreateProviderCredentialInput } from './types'

export const getModelSummary = () => request<AdminModelSummaryResponse>({ url: adminEndpoints.modelSummary })
export const getUserSummary = () => request<UserSummaryResponse>({ url: adminEndpoints.userSummary })
export const getAdminModels = (params: AdminListQuery) => request<AdminModelListResponse>({ url: adminEndpoints.models, params })
export const getAdminUsers = (params: AdminListQuery) => request<UserListResponse>({ url: adminEndpoints.users, params })
export const updateAdminModel = (id: string, data: Partial<Pick<AdminModel, 'enabled' | 'featured' | 'status'>>) => request<AdminModel>({ method: 'PATCH', url: adminEndpoints.model(id), data })
export const getModelPricing = (id: string) => request<ModelPricingResponse>({ url: adminEndpoints.modelPricing(id) })
export const updateModelPricing = (id: string, data: UpdateModelPricingInput) => request<ModelPricingResponse>({ method: 'PUT', url: adminEndpoints.modelPricing(id), data })
export const getProviderCredentials = () => request<ProviderCredentialListResponse>({ url: adminEndpoints.credentials })
export const createProviderCredential = (data: CreateProviderCredentialInput) => request<ProviderCredentialListResponse['data'][number]>({ method: 'POST', url: adminEndpoints.credentials, data })
export const updateProviderCredential = (id: string, data: { name?: string; apiKey?: string; enabled?: boolean }) => request<ProviderCredentialListResponse['data'][number]>({ method: 'PATCH', url: adminEndpoints.credential(id), data })
export const deleteProviderCredential = (id: string) => request<void>({ method: 'DELETE', url: adminEndpoints.credential(id) })
export const getProviderChannels = () => request<ProviderChannelListResponse>({ url: adminEndpoints.channels })
export const createProviderChannel = (data: CreateProviderChannelInput) => request<ProviderChannel>({ method: 'POST', url: adminEndpoints.channels, data })
export const updateProviderChannel = (id: string, data: Partial<Pick<ProviderChannel, 'name' | 'credentialId' | 'region' | 'timeoutMs' | 'maxConcurrency' | 'enabled'>>) => request<ProviderChannel>({ method: 'PATCH', url: adminEndpoints.channel(id), data })
export const deleteProviderChannel = (id: string) => request<void>({ method: 'DELETE', url: adminEndpoints.channel(id) })
export const getModelDeployments = () => request<ModelDeploymentListResponse>({ url: adminEndpoints.deployments })
export const createModelDeployment = (data: CreateModelDeploymentInput) => request<ModelDeployment>({ method: 'POST', url: adminEndpoints.deployments, data })
export const updateModelDeployment = (id: string, data: Partial<Pick<ModelDeployment, 'upstreamModelId' | 'priority' | 'weight' | 'enabled'>>) => request<ModelDeployment>({ method: 'PATCH', url: adminEndpoints.deployment(id), data })
export const deleteModelDeployment = (id: string) => request<void>({ method: 'DELETE', url: adminEndpoints.deployment(id) })
export { adminEndpoints }
export type * from './types'
export type { AdminModel, ModelPricingResponse, UpdateModelPricingInput } from '@gateway/contracts'
