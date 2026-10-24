import { createApp } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import router from './router'
import 'virtual:uno.css'
import 'ant-design-vue/dist/reset.css'
import '@gateway/ui/tokens.css'
import '@gateway/ui/scrollbars.css'
import '@gateway/ui/antdv.css'
import './styles/index.css'

document.body.classList.add('nexus-ant-app')

createApp(App).use(VueQueryPlugin).use(router).mount('#app')
