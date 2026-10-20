const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly payload?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { detail?: string | string[] } | undefined
    const detail = Array.isArray(payload?.detail) ? payload.detail.join(', ') : payload?.detail
    throw new ApiError(response.status, detail ?? `Request failed with status ${response.status}`, payload)
  }
  return response.json() as Promise<T>
}
