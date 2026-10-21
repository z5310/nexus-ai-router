import type { AuthResponse } from '@gateway/contracts'
import { refreshAccess, request } from '../../../lib/http'
import { authEndpoints } from './endpoints'
import type { LoginInput } from './types'

export const login = (input: LoginInput) => request<AuthResponse>({ method: 'POST', url: authEndpoints.login, data: input })
export const refreshSession = () => refreshAccess()
export const logout = () => request<void>({ method: 'POST', url: authEndpoints.logout })
export { authEndpoints }
export type * from './types'
