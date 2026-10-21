import type { AuthResponse } from '@gateway/contracts'
import { refreshAccess, request } from '../../../lib/http'
import { authEndpoints } from './endpoints'
import type { AdminLoginInput } from './types'

export const login = (input: AdminLoginInput) => request<AuthResponse>({ method: 'POST', url: authEndpoints.login, data: { ...input, remember: true } })
export const refreshSession = () => refreshAccess()
export const logout = () => request<void>({ method: 'POST', url: authEndpoints.logout })
export type * from './types'
