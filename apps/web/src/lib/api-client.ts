import type { AuthResponse } from '@gateway/contracts'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
let accessToken: string | null = null
let refreshPromise: Promise<AuthResponse> | null = null

export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly payload?: unknown) {
    super(message)
    this.name = 'ApiError'
  }
}

export function setAccessToken(token: string | null) { accessToken = token }

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T
  const payload = await response.json().catch(() => undefined) as { detail?: string | string[] } | undefined
  if (!response.ok) {
    const detail = Array.isArray(payload?.detail) ? payload.detail.join(', ') : payload?.detail
    throw new ApiError(response.status, detail ?? `Request failed with status ${response.status}`, payload)
  }
  return payload as T
}

export async function refreshAccess(): Promise<AuthResponse> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST', headers: { Accept: 'application/json' }, credentials: 'include',
    }).then(parse<AuthResponse>).then((result) => {
      setAccessToken(result.accessToken)
      return result
    }).finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

export async function requestJson<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: 'include' })
  if (response.status === 401 && retry && !path.startsWith('/api/auth/')) {
    await refreshAccess()
    return requestJson<T>(path, init, false)
  }
  return parse<T>(response)
}

export function getJson<T>(path: string, signal?: AbortSignal): Promise<T> { return requestJson<T>(path, { signal }) }
export function postJson<T>(path: string, body?: unknown): Promise<T> { return requestJson<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }) }
export function patchJson<T>(path: string, body: unknown): Promise<T> { return requestJson<T>(path, { method: 'PATCH', body: JSON.stringify(body) }) }
