/** Serialize cookie rotation across tabs on the same origin; tokens stay in memory. */
export function createSessionRefresh<T>(rotate: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null
  return () => {
    if (!pending) {
      const locks = typeof navigator === 'undefined' ? undefined : navigator.locks
      pending = Promise.resolve().then(async () => locks
        ? await locks.request('nexus-refresh-session', rotate)
        : await rotate())
        .finally(() => { pending = null })
    }
    return pending
  }
}
