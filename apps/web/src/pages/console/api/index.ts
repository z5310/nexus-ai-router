import type { DashboardOverviewResponse, ModelListResponse, RequestLogListResponse } from '@gateway/contracts'
import { request } from '../../../lib/http'
import { consoleEndpoints } from './endpoints'

export const getDashboardOverview = (signal?: AbortSignal) => request<DashboardOverviewResponse>({ url: consoleEndpoints.overview, signal })
export const getConsoleModels = (signal?: AbortSignal) => request<ModelListResponse>({ url: consoleEndpoints.models, params: { pageSize: 100 }, signal })
export const getRequestLogs = (signal?: AbortSignal) => request<RequestLogListResponse>({ url: consoleEndpoints.requests, params: { limit: 50 }, signal })
export { consoleEndpoints }
export type * from './types'
