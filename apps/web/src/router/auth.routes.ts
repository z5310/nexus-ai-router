import type { RouteRecordRaw } from 'vue-router'

export const authRoutes: RouteRecordRaw[] = [
  { path: '/login', component: () => import('../pages/login/index.vue'), meta: { titleKey: 'pageTitles.login' } },
  { path: '/register', component: () => import('../pages/login/register.vue'), meta: { titleKey: 'pageTitles.login' } },
  { path: '/forgot-password', component: () => import('../pages/login/forgot-password.vue'), meta: { titleKey: 'pageTitles.login' } },
  { path: '/reset-password', component: () => import('../pages/login/reset-password.vue'), meta: { titleKey: 'pageTitles.login' } },
  { path: '/auth/callback', component: () => import('../pages/login/oauth-callback.vue'), meta: { titleKey: 'pageTitles.login' } },
  { path: '/workspace-invitations/:token', component: () => import('../pages/workspace-invitations/index.vue'), meta: { titleKey: 'pageTitles.workspaceInvitation', requiresAuth: true } },
]
