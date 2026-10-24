import { createRouter, createWebHistory } from 'vue-router'
import { authState, restoreSession } from './lib/auth'
import { safeRedirect } from './lib/redirect'
import { ensureWorkspaceContext } from './lib/workspace'
import { readScrollPosition, rememberWindowScroll } from './lib/scroll-restoration'

const ConsoleSectionView = () => import('./pages/console/section.vue')

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (to, _from, savedPosition) => savedPosition ?? readScrollPosition(to.fullPath) ?? { left: 0, top: 0 },
  routes: [
    { path: '/', component: () => import('./pages/home/index.vue'), meta: { titleKey: 'pageTitles.home' } },
    { path: '/models', component: () => import('./pages/models/index.vue'), meta: { titleKey: 'pageTitles.models' } },
    { path: '/models/:provider/:model', component: () => import('./pages/models/detail.vue'), meta: { titleKey: 'pageTitles.modelDetail' } },
    { path: '/rankings', component: () => import('./pages/rankings/index.vue'), meta: { titleKey: 'pageTitles.rankings' } },
    { path: '/docs', component: () => import('./pages/docs/index.vue'), meta: { titleKey: 'pageTitles.docs' } },
    { path: '/console', component: () => import('./pages/console/index.vue'), meta: { titleKey: 'pageTitles.console', requiresAuth: true } },
    { path: '/console/models', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleModels', section: 'models', requiresAuth: true } },
    { path: '/console/routes', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleRoutes', section: 'routes', requiresAuth: true } },
    { path: '/console/keys', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleKeys', section: 'keys', requiresAuth: true } },
    { path: '/console/logs', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleLogs', section: 'logs', requiresAuth: true } },
    { path: '/console/billing', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleBilling', section: 'billing', requiresAuth: true } },
    { path: '/console/members', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleMembers', section: 'members', requiresAuth: true } },
    { path: '/console/settings', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleSettings', section: 'settings', requiresAuth: true } },
    { path: '/workspace-invitations/:token', component: () => import('./pages/workspace-invitations/index.vue'), meta: { titleKey: 'pageTitles.workspaceInvitation', requiresAuth: true } },
    { path: '/admin/:pathMatch(.*)*', component: () => import('./pages/admin-redirect/index.vue'), meta: { titleKey: 'pageTitles.admin', requiresAuth: true, requiresAdmin: true } },
    { path: '/login', component: () => import('./pages/login/index.vue'), meta: { titleKey: 'pageTitles.login' } },
    { path: '/register', component: () => import('./pages/login/register.vue'), meta: { titleKey: 'pageTitles.login' } },
    { path: '/forgot-password', component: () => import('./pages/login/forgot-password.vue'), meta: { titleKey: 'pageTitles.login' } },
    { path: '/reset-password', component: () => import('./pages/login/reset-password.vue'), meta: { titleKey: 'pageTitles.login' } },
    { path: '/auth/callback', component: () => import('./pages/login/oauth-callback.vue'), meta: { titleKey: 'pageTitles.login' } },
  ],
})

router.beforeEach(async (to, from) => {
  if (from.matched.length) rememberWindowScroll(from.fullPath)
  const user = authState.ready ? authState.user : await restoreSession()
  if (user && (to.path === '/login' || to.path === '/register')) return safeRedirect(to.query.redirect)
  if (!to.meta.requiresAuth) return true
  if (!user) return { path: '/login', query: { redirect: to.fullPath, ...(to.meta.requiresAdmin ? { admin: '1' } : {}) } }
  if (to.meta.requiresAdmin && user.role !== 'admin') return { path: '/console' }
  if (to.path.startsWith('/console')) {
    try { await ensureWorkspaceContext(user.id) } catch { /* Console renders a retryable workspace error. */ }
  }
  return true
})

export default router
