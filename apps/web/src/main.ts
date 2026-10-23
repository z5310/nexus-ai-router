import { createApp } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import scrollReveal from './directives/reveal'
import 'virtual:uno.css'
import '@gateway/ui/tokens.css'
import '@gateway/ui/scrollbars.css'
import './styles/index.css'

createApp(App).use(VueQueryPlugin).use(router).use(i18n).directive('reveal', scrollReveal).mount('#app')
