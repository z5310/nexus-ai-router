import { createRouter, createWebHistory } from 'vue-router'
import { readScrollPosition } from '../lib/scroll-restoration'
import { authRoutes } from './auth.routes'
import { consoleRoutes } from './console.routes'
import { installRouterGuards } from './guards'
import { publicRoutes } from './public.routes'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (to, _from, savedPosition) => savedPosition ?? readScrollPosition(to.fullPath) ?? { left: 0, top: 0 },
  routes: [...publicRoutes, ...authRoutes, ...consoleRoutes],
})

installRouterGuards(router)

export default router
