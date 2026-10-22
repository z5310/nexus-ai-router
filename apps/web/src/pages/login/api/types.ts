export type { AuthResponse, AuthUser } from '@gateway/contracts'
export interface LoginInput { email: string; password: string; remember: boolean }
export interface RegisterInput { name: string; email: string; password: string; remember: boolean }
export interface ForgotPasswordInput { email: string }
export interface ResetPasswordInput { token: string; password: string }
export interface ChangePasswordInput { currentPassword: string; password: string }
