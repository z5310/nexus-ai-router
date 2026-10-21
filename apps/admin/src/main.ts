import { createApp } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import router from './router'
import 'virtual:uno.css'
import '@gateway/ui/tokens.css'
import './styles/index.css'

createApp(App).use(VueQueryPlugin).use(router).mount('#app')
