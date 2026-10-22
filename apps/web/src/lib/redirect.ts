export function safeRedirect(value: unknown, fallback = '/console'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return fallback
  try {
    const url = new URL(value, 'https://nexus.invalid')
    if (url.origin !== 'https://nexus.invalid' || /^\/(login|register|auth\/callback)(\/|$)/.test(url.pathname)) return fallback
    return url.pathname + url.search + url.hash
  } catch { return fallback }
}
