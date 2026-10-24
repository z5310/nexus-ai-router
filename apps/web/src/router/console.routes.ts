import type { RouteRecordRaw } from 'vue-router'

const ConsoleSectionView = () => import('../pages/console/section.vue')

export const consoleRoutes: RouteRecordRaw[] = [
  { path: '/console', component: () => import('../pages/console/index.vue'), meta: { titleKey: 'pageTitles.console', requiresAuth: true } },
  { path: '/console/models', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleModels', section: 'models', requiresAuth: true } },
  { path: '/console/routes', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleRoutes', section: 'routes', requiresAuth: true } },
  { path: '/console/keys', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleKeys', section: 'keys', requiresAuth: true } },
  { path: '/console/logs', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleLogs', section: 'logs', requiresAuth: true } },
  { path: '/console/billing', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleBilling', section: 'billing', requiresAuth: true } },
  { path: '/console/members', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleMembers', section: 'members', requiresAuth: true } },
  { path: '/console/settings', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleSettings', section: 'settings', requiresAuth: true } },
  { path: '/admin/:pathMatch(.*)*', component: () => import('../pages/admin-redirect/index.vue'), meta: { titleKey: 'pageTitles.admin', requiresAuth: true, requiresAdmin: true } },
]
