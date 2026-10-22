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
