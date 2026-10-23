const storagePrefix = 'nexus:scroll:'

export interface ScrollCoordinates {
  left: number
  top: number
}

function storageKey(route: string) {
  return `${storagePrefix}${route}`
}

export function readScrollPosition(route: string): ScrollCoordinates | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const stored = sessionStorage.getItem(storageKey(route))
    if (!stored) return null
    const value = JSON.parse(stored) as Partial<ScrollCoordinates>
    if (!Number.isFinite(value.left) || !Number.isFinite(value.top)) return null
    return { left: Number(value.left), top: Number(value.top) }
  } catch {
    return null
  }
}

export function writeScrollPosition(route: string, position: ScrollCoordinates) {
  if (!route || typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(storageKey(route), JSON.stringify(position))
  } catch {
    // Scroll restoration is progressive enhancement when storage is unavailable.
  }
}

export function rememberWindowScroll(route: string) {
  if (typeof window === 'undefined') return
  writeScrollPosition(route, { left: window.scrollX, top: window.scrollY })
}
