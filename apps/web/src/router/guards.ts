import type { Router } from 'vue-router'
import { safeRedirect } from '../lib/redirect'
import { rememberWindowScroll } from '../lib/scroll-restoration'
import { authStore } from '../stores/auth'
import { workspaceStore } from '../stores/workspace'

export function installRouterGuards(router: Router) {
  router.beforeEach(async (to, from) => {
    if (from.matched.length) rememberWindowScroll(from.fullPath)
    const user = authStore.ready ? authStore.user : await authStore.restoreSession()
    if (user && (to.path === '/login' || to.path === '/register')) return safeRedirect(to.query.redirect)
    if (!to.meta.requiresAuth) return true
    if (!user) return { path: '/login', query: { redirect: to.fullPath, ...(to.meta.requiresAdmin ? { admin: '1' } : {}) } }
    if (to.meta.requiresAdmin && user.role !== 'admin') return { path: '/console' }
    if (to.path.startsWith('/console')) {
      try { await workspaceStore.ensure(user.id) } catch { /* Console renders a retryable workspace error. */ }
    }
    return true
  })
}
