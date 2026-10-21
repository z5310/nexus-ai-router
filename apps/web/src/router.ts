import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import ModelsView from './views/ModelsView.vue'
import RankingsView from './views/RankingsView.vue'
import DocsView from './views/DocsView.vue'
import ConsoleView from './views/ConsoleView.vue'
import ConsoleSectionView from './views/ConsoleSectionView.vue'
import LoginView from './views/LoginView.vue'
import ModelDetailView from './views/ModelDetailView.vue'
import AdminView from './views/AdminView.vue'
import { authState, restoreSession } from './lib/auth'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
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
    { path: '/admin', component: AdminView, meta: { titleKey: 'pageTitles.admin', requiresAuth: true, requiresAdmin: true } },
    { path: '/login', component: LoginView, meta: { titleKey: 'pageTitles.login' } },
  ],
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true
  const user = authState.ready ? authState.user : await restoreSession()
  if (!user) return { path: '/login', query: { redirect: to.fullPath, ...(to.meta.requiresAdmin ? { admin: '1' } : {}) } }
  if (to.meta.requiresAdmin && user.role !== 'admin') return { path: '/console' }
  return true
})

export default router
