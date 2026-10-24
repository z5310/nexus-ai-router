import type { RouteRecordRaw } from 'vue-router'

export const adminRoutes: RouteRecordRaw[] = [
  { path: '/', redirect: '/admin' },
  { path: '/login', component: () => import('../pages/login/index.vue') },
  { path: '/admin/:section?', component: () => import('../pages/dashboard/index.vue'), meta: { requiresAdmin: true } },
]
