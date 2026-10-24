import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { AuthResponse, AuthUser } from '@gateway/contracts'
import { login, logout, refreshSession, register } from '../pages/login/api'
import { ApiError, setAccessToken } from '../lib/http'
import { pinia } from './pinia'
import { workspaceStore } from './workspace'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const ready = ref(false)

  function apply(result: AuthResponse) {
    setAccessToken(result.accessToken)
    user.value = result.user
    ready.value = true
    return result.user
  }

  async function signIn(email: string, password: string, remember: boolean) {
    return apply(await login({ email, password, remember }))
  }

  async function signUp(name: string, email: string, password: string, remember: boolean) {
    return apply(await register({ name, email, password, remember }))
  }

  async function restoreSession(): Promise<AuthUser | null> {
    if (ready.value) return user.value
    try { return apply(await refreshSession()) } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) console.error(error)
      setAccessToken(null)
      user.value = null
      ready.value = true
      return null
    }
  }

  async function signOut() {
    try { await logout() } finally {
      setAccessToken(null)
      workspaceStore.reset()
      user.value = null
      ready.value = true
    }
  }

  return { user, ready, signIn, signUp, restoreSession, signOut }
})

export const authStore = useAuthStore(pinia)
export const authState = authStore
export const signIn = (email: string, password: string, remember: boolean) => authStore.signIn(email, password, remember)
export const signUp = (name: string, email: string, password: string, remember: boolean) => authStore.signUp(name, email, password, remember)
export const restoreSession = () => authStore.restoreSession()
export const signOut = () => authStore.signOut()
