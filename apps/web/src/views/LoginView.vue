<script setup lang="ts">
import { ArrowLeft, Check, Eye, EyeOff, Globe2, LoaderCircle, LockKeyhole, Mail } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BrandLogo from '../components/BrandLogo.vue'
import { signIn } from '../lib/auth'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const showPassword = ref(false)
const remember = ref(true)
const loading = ref(false)
const error = ref('')
const email = ref(route.query.admin === '1' ? 'admin@nexus.cn' : 'demo@nexus.cn')
const password = ref(route.query.admin === '1' ? 'Nexus@123456' : 'nexus-demo')

async function submit() {
  error.value = ''; loading.value = true
  try {
    const user = await signIn(email.value, password.value, remember.value)
    const target = typeof route.query.redirect === 'string' ? route.query.redirect : user.role === 'admin' ? '/admin' : '/console'
    await router.replace(target)
  } catch (reason) { error.value = reason instanceof Error ? reason.message : t('auth.failed') } finally { loading.value = false }
}
</script>

<template>
  <main class="login-page">
    <div class="login-backdrop"><i /><i /><i /></div>
    <header><BrandLogo /><RouterLink to="/"><ArrowLeft :size="17" />{{ t('auth.backHome') }}</RouterLink></header>
    <section class="login-card">
      <div class="login-mark"><LockKeyhole :size="24" /></div><span>NEXUS CONSOLE</span><h1>{{ t('auth.title') }}</h1><p>{{ t('auth.description') }}</p>
      <form @submit.prevent="submit">
        <label>{{ t('auth.email') }}<span><Mail :size="18" /><input v-model="email" type="email" autocomplete="email" required /></span></label>
        <label>{{ t('auth.password') }}<span><LockKeyhole :size="18" /><input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" required /><button type="button" :aria-label="t('auth.togglePassword')" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="18" /><Eye v-else :size="18" /></button></span></label>
        <div class="login-options"><label><input v-model="remember" type="checkbox" />{{ t('auth.remember') }}</label><a href="#">{{ t('auth.forgot') }}</a></div>
        <p v-if="error" class="login-error" role="alert">{{ error }}</p>
        <button class="login-submit" type="submit" :disabled="loading"><LoaderCircle v-if="loading" class="spin" :size="18" />{{ loading ? t('auth.signingIn') : t('common.login') }}</button>
      </form>
      <div class="login-divider"><span>{{ t('auth.or') }}</span></div><button class="sso-button" type="button"><Globe2 :size="19" />{{ t('auth.sso') }}</button>
      <footer><Check :size="15" /><span>{{ t('auth.demoHint') }}<br><b>{{ t('auth.adminHint') }}</b></span></footer>
    </section>
  </main>
</template>
