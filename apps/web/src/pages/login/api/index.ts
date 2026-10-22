import type { AuthResponse, AuthSessionListResponse, PasswordResetRequestResponse } from '@gateway/contracts'
import { refreshAccess, request } from '../../../lib/http'
import { authEndpoints } from './endpoints'
import type { ChangePasswordInput, ForgotPasswordInput, LoginInput, RegisterInput, ResetPasswordInput } from './types'

export const register = (input: RegisterInput) => request<AuthResponse>({ method: 'POST', url: authEndpoints.register, data: input })
export const login = (input: LoginInput) => request<AuthResponse>({ method: 'POST', url: authEndpoints.login, data: input })
export const forgotPassword = (input: ForgotPasswordInput) => request<PasswordResetRequestResponse>({ method: 'POST', url: authEndpoints.forgotPassword, data: input })
export const resetPassword = (input: ResetPasswordInput) => request<void>({ method: 'POST', url: authEndpoints.resetPassword, data: input })
export const changePassword = (input: ChangePasswordInput) => request<void>({ method: 'POST', url: authEndpoints.changePassword, data: input })
export const getSessions = () => request<AuthSessionListResponse>({ url: authEndpoints.sessions })
export const revokeSession = (id: string) => request<void>({ method: 'DELETE', url: authEndpoints.session(id) })
export const revokeAllSessions = () => request<void>({ method: 'DELETE', url: authEndpoints.sessions })
export const refreshSession = () => refreshAccess()
export const logout = () => request<void>({ method: 'POST', url: authEndpoints.logout })
export { authEndpoints }
export type * from './types'
