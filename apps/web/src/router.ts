import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './pages/home/index.vue'
import ModelsView from './pages/models/index.vue'
import RankingsView from './pages/rankings/index.vue'
import DocsView from './pages/docs/index.vue'
import ConsoleView from './pages/console/index.vue'
import ConsoleSectionView from './pages/console/section.vue'
import LoginView from './pages/login/index.vue'
import OAuthCallbackView from './pages/login/oauth-callback.vue'
import RegisterView from './pages/login/register.vue'
import ForgotPasswordView from './pages/login/forgot-password.vue'
import ResetPasswordView from './pages/login/reset-password.vue'
import ModelDetailView from './pages/models/detail.vue'
import AdminRedirectView from './pages/admin-redirect/index.vue'
import WorkspaceInvitationView from './pages/workspace-invitations/index.vue'
import { authState, restoreSession } from './lib/auth'
import { safeRedirect } from './lib/redirect'
import { ensureWorkspaceContext } from './lib/workspace'
import { readScrollPosition, rememberWindowScroll } from './lib/scroll-restoration'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (to, _from, savedPosition) => savedPosition ?? readScrollPosition(to.fullPath) ?? { left: 0, top: 0 },
  routes: [
    { path: '/', component: HomeView, meta: { titleKey: 'pageTitles.home' } },
    { path: '/models', component: ModelsView, meta: { titleKey: 'pageTitles.models' } },
    { path: '/models/:provider/:model', component: ModelDetailView, meta: { titleKey: 'pageTitles.modelDetail' } },
    { path: '/rankings', component: RankingsView, meta: { titleKey: 'pageTitles.rankings' } },
    { path: '/docs', component: DocsView, meta: { titleKey: 'pageTitles.docs' } },
    { path: '/console', component: ConsoleView, meta: { titleKey: 'pageTitles.console', requiresAuth: true } },
    { path: '/console/models', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleModels', section: 'models', requiresAuth: true } },
    { path: '/console/routes', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleRoutes', section: 'routes', requiresAuth: true } },
    { path: '/console/keys', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleKeys', section: 'keys', requiresAuth: true } },
    { path: '/console/logs', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleLogs', section: 'logs', requiresAuth: true } },
    { path: '/console/billing', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleBilling', section: 'billing', requiresAuth: true } },
    { path: '/console/members', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleMembers', section: 'members', requiresAuth: true } },
    { path: '/console/settings', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleSettings', section: 'settings', requiresAuth: true } },
    { path: '/workspace-invitations/:token', component: WorkspaceInvitationView, meta: { titleKey: 'pageTitles.workspaceInvitation', requiresAuth: true } },
    { path: '/admin/:pathMatch(.*)*', component: AdminRedirectView, meta: { titleKey: 'pageTitles.admin', requiresAuth: true, requiresAdmin: true } },
    { path: '/login', component: LoginView, meta: { titleKey: 'pageTitles.login' } },
    { path: '/register', component: RegisterView, meta: { titleKey: 'pageTitles.login' } },
    { path: '/forgot-password', component: ForgotPasswordView, meta: { titleKey: 'pageTitles.login' } },
    { path: '/reset-password', component: ResetPasswordView, meta: { titleKey: 'pageTitles.login' } },
    { path: '/auth/callback', component: OAuthCallbackView, meta: { titleKey: 'pageTitles.login' } },
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
