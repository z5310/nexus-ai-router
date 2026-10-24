import type { Router } from 'vue-router'
import { authStore } from '../stores/auth'

export function installAdminGuards(router: Router) {
  router.beforeEach(async (to) => {
    if (!to.meta.requiresAdmin) return true
    const user = authStore.ready ? authStore.user : await authStore.restoreSession()
    if (!user) return '/login'
    if (user.role !== 'admin') return '/login?forbidden=1'
    return true
  })
}
