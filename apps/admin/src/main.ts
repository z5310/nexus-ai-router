import { createApp } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import router from './router'
import { pinia } from './stores/pinia'
import 'virtual:uno.css'
import 'ant-design-vue/dist/reset.css'
import '@gateway/ui/tokens.css'
import '@gateway/ui/scrollbars.css'
import '@gateway/ui/antdv.css'
import './styles/index.css'

document.body.classList.add('nexus-ant-app')

createApp(App).use(pinia).use(VueQueryPlugin, {
  queryClientConfig: {
    defaultOptions: {
      queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: 1, refetchOnWindowFocus: false },
      mutations: { retry: 0 },
    },
  },
}).use(router).mount('#app')
