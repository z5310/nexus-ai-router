<script setup lang="ts">
import { Menu, X, ArrowUpRight, Check, Globe2 } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { authState } from '../lib/auth'
import UserMenu from '../pages/console/cmp/UserMenu.vue'
import { useI18n } from 'vue-i18n'
import BrandLogo from './BrandLogo.vue'
import { languages, setLocale, type SupportedLocale } from '../i18n'

const menuOpen = ref(false)
const route = useRoute()
const languageOpen = ref(false)
const { t, locale } = useI18n()

const chooseLanguage = (code: SupportedLocale) => {
  setLocale(code)
  languageOpen.value = false
}
</script>

<template>
  <header class="site-header">
    <div class="nav-wrap">
      <BrandLogo />
      <nav :class="['main-nav', { open: menuOpen }]" :aria-label="t('common.mainNav')">
        <RouterLink to="/" @click="menuOpen = false">{{ t('common.home') }}</RouterLink>
        <RouterLink to="/models" @click="menuOpen = false">{{ t('common.models') }}</RouterLink>
        <RouterLink to="/rankings" @click="menuOpen = false">{{ t('common.rankings') }}</RouterLink>
        <a href="/docs" target="_blank" rel="noopener noreferrer" @click="menuOpen = false">{{ t('common.docs') }} <ArrowUpRight :size="12" /></a>
        <RouterLink to="/console" @click="menuOpen = false">{{ t('common.console') }} <ArrowUpRight :size="12" /></RouterLink>
      </nav>
      <div class="nav-actions">
        <div class="language-switcher">
          <button class="language-trigger" :aria-expanded="languageOpen" :aria-label="t('language.label')" @click="languageOpen = !languageOpen"><Globe2 :size="17" /></button>
          <div v-if="languageOpen" class="language-menu">
            <button v-for="language in languages" :key="language.code" :class="{ active: locale === language.code }" @click="chooseLanguage(language.code)"><span>{{ t(language.labelKey) }}</span><Check v-if="locale === language.code" :size="14" /></button>
          </div>
        </div>
        <div v-if="authState.user" class="site-account"><span>{{ authState.user.name || authState.user.email }}</span><UserMenu /></div>
        <RouterLink v-else class="login-button" :to="{ path: '/login', query: { redirect: route.fullPath } }">{{ t('common.login') }}</RouterLink>
      </div>
      <button class="menu-button" :aria-expanded="menuOpen" :aria-label="t('common.openNav')" @click="menuOpen = !menuOpen">
        <X v-if="menuOpen" :size="20" /><Menu v-else :size="20" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.site-account { display:flex; align-items:center; gap:10px; }
.site-account > span { max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#fff; font-size:14px; }
@media(max-width:760px) { .site-account > span { display:none; } }
</style>
