<script setup lang="ts">
import { ArrowLeft, Check, Eye, EyeOff, Globe2, LockKeyhole, Mail } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BrandLogo from '../components/BrandLogo.vue'

const { t } = useI18n()
const router = useRouter()
const showPassword = ref(false)
const email = ref('demo@nexus.cn')
const password = ref('nexus-demo')
const submit = () => router.push('/console')
</script>

<template>
  <main class="login-page">
    <div class="login-backdrop"><i /><i /><i /></div>
    <header><BrandLogo /><RouterLink to="/"><ArrowLeft :size="15" />{{ t('auth.backHome') }}</RouterLink></header>
    <section class="login-card">
      <div class="login-mark"><LockKeyhole :size="22" /></div><span>NEXUS CONSOLE</span><h1>{{ t('auth.title') }}</h1><p>{{ t('auth.description') }}</p>
      <form @submit.prevent="submit">
        <label>{{ t('auth.email') }}<span><Mail :size="16" /><input v-model="email" type="email" autocomplete="email" required /></span></label>
        <label>{{ t('auth.password') }}<span><LockKeyhole :size="16" /><input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" required /><button type="button" :aria-label="t('auth.togglePassword')" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="16" /><Eye v-else :size="16" /></button></span></label>
        <div class="login-options"><label><input type="checkbox" checked />{{ t('auth.remember') }}</label><a href="#">{{ t('auth.forgot') }}</a></div>
        <button class="login-submit" type="submit">{{ t('common.login') }}</button>
      </form>
      <div class="login-divider"><span>{{ t('auth.or') }}</span></div><button class="sso-button"><Globe2 :size="17" />{{ t('auth.sso') }}</button>
      <footer><Check :size="13" />{{ t('auth.demoHint') }}</footer>
    </section>
  </main>
</template>
