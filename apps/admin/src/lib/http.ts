import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import type { AuthResponse } from '@gateway/contracts'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? ''
let accessToken: string | null = null
let refreshPromise: Promise<AuthResponse> | null = null

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }

export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly payload?: unknown) {
    super(message)
    this.name = 'ApiError'
  }
}

export const http = axios.create({ baseURL, withCredentials: true, headers: { Accept: 'application/json' } })

export function setAccessToken(token: string | null) { accessToken = token }

http.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

export async function refreshAccess(): Promise<AuthResponse> {
  if (!refreshPromise) {
    refreshPromise = axios.post<AuthResponse>('/api/auth/refresh', undefined, { baseURL, withCredentials: true })
      .then(({ data }) => { setAccessToken(data.accessToken); return data })
      .finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

http.interceptors.response.use((response) => response, async (reason: AxiosError<{ detail?: string | string[] }>) => {
  const config = reason.config as RetryConfig | undefined
  if (reason.response?.status === 401 && config && !config._retry && !config.url?.startsWith('/api/auth/')) {
    config._retry = true
    await refreshAccess()
    return http(config)
  }
  const detail = reason.response?.data?.detail
  throw new ApiError(reason.response?.status ?? 0, Array.isArray(detail) ? detail.join(', ') : detail ?? reason.message, reason.response?.data)
})

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  return (await http.request<T>(config)).data
}
