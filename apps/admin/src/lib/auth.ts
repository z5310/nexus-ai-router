import { reactive, readonly } from 'vue'
import type { AuthResponse, AuthUser } from '@gateway/contracts'
import { login, logout, refreshSession } from '../pages/login/api'
import { ApiError, setAccessToken } from './http'

const state = reactive<{ user: AuthUser | null; ready: boolean }>({ user: null, ready: false })
export const authState = readonly(state)
function apply(result: AuthResponse) { setAccessToken(result.accessToken); state.user = result.user; state.ready = true; return result.user }
export async function signIn(email: string, password: string) { return apply(await login({ email, password })) }
export async function restoreSession() { if (state.ready) return state.user; try { return apply(await refreshSession()) } catch (error) { if (!(error instanceof ApiError) || error.status !== 401) console.error(error); setAccessToken(null); state.user = null; state.ready = true; return null } }
export async function signOut() { try { await logout() } finally { setAccessToken(null); state.user = null; state.ready = true } }
