import { reactive, readonly } from 'vue'
import type { AuthResponse, AuthUser } from '@gateway/contracts'
import { ApiError, postJson, refreshAccess, setAccessToken } from './api-client'

const state = reactive<{ user: AuthUser | null; ready: boolean }>({ user: null, ready: false })
export const authState = readonly(state)

function apply(result: AuthResponse) {
  setAccessToken(result.accessToken)
  state.user = result.user
  state.ready = true
  return result.user
}

export async function signIn(email: string, password: string, remember: boolean) { return apply(await postJson<AuthResponse>('/api/auth/login', { email, password, remember })) }
export async function restoreSession(): Promise<AuthUser | null> {
  if (state.ready) return state.user
  try { return apply(await refreshAccess()) } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) console.error(error)
    setAccessToken(null); state.user = null; state.ready = true; return null
  }
}
export async function signOut() {
  try { await postJson<void>('/api/auth/logout') } finally { setAccessToken(null); state.user = null; state.ready = true }
}
