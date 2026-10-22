<script setup lang="ts">
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resetPassword } from './api'
import AuthShell from './cmp/AuthShell.vue'

const route = useRoute()
const router = useRouter()
const token = ref(typeof route.query.token === 'string' ? route.query.token : '')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await resetPassword({ token: token.value, password: password.value })
    await router.replace({ path: '/login', query: { reset: '1' } })
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '密码重置失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell kicker="NEW PASSWORD" title="设置新密码" description="重置成功后，其他设备上的登录会话将全部失效。">
    <form @submit.prevent="submit">
      <label>重置凭证<span><LockKeyhole :size="18" /><input v-model="token" autocomplete="one-time-code" required /></span></label>
      <label>新密码<span><LockKeyhole :size="18" /><input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" minlength="10" required /><button type="button" aria-label="显示或隐藏密码" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="18" /><Eye v-else :size="18" /></button></span></label>
      <small class="auth-hint">至少 10 位，并包含大写字母、小写字母和数字。</small>
      <p v-if="error" class="login-error" role="alert">{{ error }}</p>
      <button class="login-submit" type="submit" :disabled="loading"><LoaderCircle v-if="loading" class="spin" :size="18" />{{ loading ? '正在重置…' : '更新密码' }}</button>
    </form>
    <div class="auth-switch"><RouterLink to="/login">返回登录</RouterLink></div>
  </AuthShell>
</template>
