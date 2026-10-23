<script setup lang="ts">
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { signIn } from '../../lib/auth'
import { safeRedirect } from '../../lib/redirect'
import AuthShell from './cmp/AuthShell.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const showPassword = ref(false)
const remember = ref(true)
const loading = ref(false)
const error = ref(route.query.error === 'oauth_not_configured'
  ? '第三方登录尚未配置，请联系管理员。'
  : route.query.error === 'oauth_failed' ? '第三方授权失败或已取消，请重试。' : '')
const message = ref(route.query.reset === '1' ? '密码已更新，请使用新密码登录。' : '')
const email = ref('')
const password = ref('')
function rememberDestination() { sessionStorage.setItem('nexus-login-return', safeRedirect(route.query.redirect)) }

async function submit() {
  error.value = ''; loading.value = true
  try {
    await signIn(email.value, password.value, remember.value)
    const target = safeRedirect(route.query.redirect)
    await router.replace(target)
  } catch (reason) { error.value = reason instanceof Error ? reason.message : t('auth.failed') } finally { loading.value = false }
}
</script>

<template>
  <AuthShell kicker="NEXUS CONSOLE" :title="t('auth.title')" :description="t('auth.description')">
      <form @submit.prevent="submit">
        <label>{{ t('auth.email') }}<span><Mail :size="18" /><input v-model="email" type="email" autocomplete="email" required /></span></label>
        <label>{{ t('auth.password') }}<span><LockKeyhole :size="18" /><input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" required /><button type="button" :aria-label="t('auth.togglePassword')" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="18" /><Eye v-else :size="18" /></button></span></label>
        <div class="login-options"><label><input v-model="remember" type="checkbox" />{{ t('auth.remember') }}</label><RouterLink to="/forgot-password">{{ t('auth.forgot') }}</RouterLink></div>
        <p v-if="message" class="auth-message" role="status">{{ message }}</p>
        <p v-if="error" class="login-error" role="alert">{{ error }}</p>
        <button class="login-submit" type="submit" :disabled="loading"><LoaderCircle v-if="loading" class="spin" :size="18" />{{ loading ? t('auth.signingIn') : t('common.login') }}</button>
      </form>
      <div class="login-divider"><span>{{ t('auth.or') }}</span></div>
      <div class="oauth-buttons">
        <a @click="rememberDestination" href="/api/auth/oauth/google"><svg class="google-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285f4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.25c1.9-1.75 2.97-4.34 2.97-7.39Z"/><path fill="#34a853" d="M12 22c2.7 0 4.97-.9 6.63-2.38l-3.25-2.53c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.6-4.12H3.04v2.6A10 10 0 0 0 12 22Z"/><path fill="#fbbc05" d="M6.4 13.93A6 6 0 0 1 6.09 12c0-.67.11-1.32.31-1.93v-2.6H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.53l3.36-2.6Z"/><path fill="#ea4335" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.47l3.36 2.6c.8-2.36 3-4.12 5.6-4.12Z"/></svg>{{ t('auth.google') }}</a>
        <a @click="rememberDestination" href="/api/auth/oauth/github"><svg class="github-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2.24c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.04 1.77 2.72 1.26 3.38.96.1-.75.4-1.26.74-1.55-2.57-.3-5.27-1.29-5.27-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.75 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.71 5.39-5.29 5.68.42.36.79 1.06.79 2.14v3.27c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .7Z"/></svg>{{ t('auth.github') }}</a>
      </div>
      <div class="auth-switch">还没有账户？<RouterLink :to="{ path: '/register', query: { redirect: safeRedirect(route.query.redirect) } }">创建账户</RouterLink></div>
  </AuthShell>
</template>
