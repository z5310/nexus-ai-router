import type { ApiKeyListResponse, CreateApiKeyResponse, DashboardOverviewResponse, ModelListResponse, RequestLogListResponse, RouteRule, RouteRuleListResponse, WorkspaceModelConfig, WorkspaceModelListResponse } from '@gateway/contracts'
import { request } from '../../../lib/http'
import { consoleEndpoints } from './endpoints'
import type { CreateApiKeyInput, CreateRouteRuleInput, CreateWorkspaceModelInput, UpdateRouteRuleInput, UpdateWorkspaceModelInput } from './types'

export const getDashboardOverview = (signal?: AbortSignal) => request<DashboardOverviewResponse>({ url: consoleEndpoints.overview, signal })
export const getCatalogModels = (signal?: AbortSignal) => request<ModelListResponse>({ url: consoleEndpoints.catalogModels, params: { pageSize: 100 }, signal })
export const getConsoleModels = (signal?: AbortSignal) => request<WorkspaceModelListResponse>({ url: consoleEndpoints.models, signal })
export const createConsoleModel = (data: CreateWorkspaceModelInput) => request<WorkspaceModelConfig>({ method: 'POST', url: consoleEndpoints.models, data })
export const updateConsoleModel = (id: string, data: UpdateWorkspaceModelInput) => request<WorkspaceModelConfig>({ method: 'PATCH', url: consoleEndpoints.model(id), data })
export const removeConsoleModel = (id: string) => request<void>({ method: 'DELETE', url: consoleEndpoints.model(id) })
export const getRouteRules = (signal?: AbortSignal) => request<RouteRuleListResponse>({ url: consoleEndpoints.routes, signal })
export const createRouteRule = (data: CreateRouteRuleInput) => request<RouteRule>({ method: 'POST', url: consoleEndpoints.routes, data })
export const updateRouteRule = (id: string, data: UpdateRouteRuleInput) => request<RouteRule>({ method: 'PATCH', url: consoleEndpoints.route(id), data })
export const removeRouteRule = (id: string) => request<void>({ method: 'DELETE', url: consoleEndpoints.route(id) })
export const getApiKeys = (signal?: AbortSignal) => request<ApiKeyListResponse>({ url: consoleEndpoints.keys, signal })
export const createApiKey = (data: CreateApiKeyInput) => request<CreateApiKeyResponse>({ method: 'POST', url: consoleEndpoints.keys, data })
export const revokeApiKey = (id: string) => request<void>({ method: 'DELETE', url: consoleEndpoints.key(id) })
export const getRequestLogs = (signal?: AbortSignal) => request<RequestLogListResponse>({ url: consoleEndpoints.requests, params: { limit: 50 }, signal })
export { consoleEndpoints }
export type * from './types'

export const getWorkspaceSettings = (signal?: AbortSignal) => request<import('@gateway/contracts').WorkspaceContext>({ url: '/api/workspaces/current', signal })
export const saveWorkspaceSettings = (data: { name: string; defaultCurrency: string }) => request<import('@gateway/contracts').WorkspaceContext>({ method: 'PATCH', url: '/api/workspaces/current', data })

export const getWorkspaceMembers = (signal?: AbortSignal) => request<import('@gateway/contracts').WorkspaceMemberListResponse>({ url: '/api/workspaces/current/members', signal })

export const getWorkspaceIpPolicy = (signal?: AbortSignal) => request<import('@gateway/contracts').WorkspaceIpPolicy>({ url: '/api/workspaces/current/ip-policy', signal })
export const saveWorkspaceIpPolicy = (data: import('@gateway/contracts').WorkspaceIpPolicy) => request<import('@gateway/contracts').WorkspaceIpPolicy>({ method: 'PATCH', url: '/api/workspaces/current/ip-policy', data })

export const changeWorkspaceMember = (id: string, data: import('@gateway/contracts').UpdateWorkspaceMemberInput) => request<void>({ method: 'PATCH', url: '/api/workspaces/current/members/' + id, data })
export const removeWorkspaceMember = (id: string) => request<void>({ method: 'DELETE', url: '/api/workspaces/current/members/' + id })
