import type { RouteRecordRaw } from 'vue-router'

export const publicRoutes: RouteRecordRaw[] = [
  { path: '/', component: () => import('../pages/home/index.vue'), meta: { titleKey: 'pageTitles.home' } },
  { path: '/models', component: () => import('../pages/models/index.vue'), meta: { titleKey: 'pageTitles.models' } },
  { path: '/models/:provider/:model', component: () => import('../pages/models/detail.vue'), meta: { titleKey: 'pageTitles.modelDetail' } },
  { path: '/models/:model', component: () => import('../pages/models/detail.vue'), meta: { titleKey: 'pageTitles.modelDetail' } },
  { path: '/rankings', component: () => import('../pages/rankings/index.vue'), meta: { titleKey: 'pageTitles.rankings' } },
  { path: '/docs', component: () => import('../pages/docs/index.vue'), meta: { titleKey: 'pageTitles.docs' } },
]
