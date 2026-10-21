import type { AdminModel, AdminModelListResponse, AdminModelSummaryResponse, UserListResponse, UserSummaryResponse } from '@gateway/contracts'
import { request } from '../../../lib/http'
import { adminEndpoints } from './endpoints'
import type { AdminListQuery } from './types'

export const getModelSummary = () => request<AdminModelSummaryResponse>({ url: adminEndpoints.modelSummary })
export const getUserSummary = () => request<UserSummaryResponse>({ url: adminEndpoints.userSummary })
export const getAdminModels = (params: AdminListQuery) => request<AdminModelListResponse>({ url: adminEndpoints.models, params })
export const getAdminUsers = (params: AdminListQuery) => request<UserListResponse>({ url: adminEndpoints.users, params })
export const updateAdminModel = (id: string, data: Partial<Pick<AdminModel, 'enabled' | 'featured' | 'status'>>) => request<AdminModel>({ method: 'PATCH', url: adminEndpoints.model(id), data })
export { adminEndpoints }
export type * from './types'
