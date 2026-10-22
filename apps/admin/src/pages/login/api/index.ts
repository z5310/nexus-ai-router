import type { AuthResponse, AuthSessionListResponse } from '@gateway/contracts'
import { refreshAccess, request } from '../../../lib/http'
import { authEndpoints } from './endpoints'
import type { AdminLoginInput } from './types'

export const login = (input: AdminLoginInput) => request<AuthResponse>({ method: 'POST', url: authEndpoints.login, data: { ...input, remember: true } })
export const changePassword = (currentPassword: string, password: string) => request<void>({ method: 'POST', url: authEndpoints.changePassword, data: { currentPassword, password } })
export const getSessions = () => request<AuthSessionListResponse>({ url: authEndpoints.sessions })
export const revokeSession = (id: string) => request<void>({ method: 'DELETE', url: authEndpoints.session(id) })
export const revokeAllSessions = () => request<void>({ method: 'DELETE', url: authEndpoints.sessions })
export const refreshSession = () => refreshAccess()
export const logout = () => request<void>({ method: 'POST', url: authEndpoints.logout })
export type * from './types'
