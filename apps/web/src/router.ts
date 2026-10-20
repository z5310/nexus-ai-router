import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import ModelsView from './views/ModelsView.vue'
import RankingsView from './views/RankingsView.vue'
import DocsView from './views/DocsView.vue'
import ConsoleView from './views/ConsoleView.vue'
import ConsoleSectionView from './views/ConsoleSectionView.vue'
import LoginView from './views/LoginView.vue'
import ModelDetailView from './views/ModelDetailView.vue'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', component: HomeView, meta: { titleKey: 'pageTitles.home' } },
    { path: '/models', component: ModelsView, meta: { titleKey: 'pageTitles.models' } },
    { path: '/models/:provider/:model', component: ModelDetailView, meta: { titleKey: 'pageTitles.modelDetail' } },
    { path: '/rankings', component: RankingsView, meta: { titleKey: 'pageTitles.rankings' } },
    { path: '/docs', component: DocsView, meta: { titleKey: 'pageTitles.docs' } },
    { path: '/console', component: ConsoleView, meta: { titleKey: 'pageTitles.console' } },
    { path: '/console/models', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleModels', section: 'models' } },
    { path: '/console/routes', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleRoutes', section: 'routes' } },
    { path: '/console/keys', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleKeys', section: 'keys' } },
    { path: '/console/logs', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleLogs', section: 'logs' } },
    { path: '/console/billing', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleBilling', section: 'billing' } },
    { path: '/console/members', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleMembers', section: 'members' } },
    { path: '/console/settings', component: ConsoleSectionView, meta: { titleKey: 'pageTitles.consoleSettings', section: 'settings' } },
    { path: '/login', component: LoginView, meta: { titleKey: 'pageTitles.login' } },
  ],
})

export default router
