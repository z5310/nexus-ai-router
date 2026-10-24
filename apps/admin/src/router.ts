import { createRouter, createWebHistory } from 'vue-router'
import { authState, restoreSession } from './lib/auth'

const router = createRouter({ history: createWebHistory(), routes: [
  { path: '/', redirect: '/admin' },
  { path: '/login', component: () => import('./pages/login/index.vue') },
  { path: '/admin/:section?', component: () => import('./pages/dashboard/index.vue'), meta: { requiresAdmin: true } },
] })

router.beforeEach(async (to) => { if (!to.meta.requiresAdmin) return true; const user = authState.ready ? authState.user : await restoreSession(); if (!user) return '/login'; if (user.role !== 'admin') return '/login?forbidden=1'; return true })
export default router
