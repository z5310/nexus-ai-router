import { createRouter, createWebHistory } from 'vue-router'
import { installAdminGuards } from './guards'
import { adminRoutes } from './routes'

const router = createRouter({ history: createWebHistory(), routes: adminRoutes })

installAdminGuards(router)

export default router
