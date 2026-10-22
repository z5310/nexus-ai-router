<script setup lang="ts">
import { LoaderCircle, Mail } from 'lucide-vue-next'
import { ref } from 'vue'
import { forgotPassword } from './api'
import AuthShell from './cmp/AuthShell.vue'

const email = ref('')
const loading = ref(false)
const message = ref('')
const debugToken = ref('')

async function submit() {
  loading.value = true
  message.value = ''
  debugToken.value = ''
  try {
    const result = await forgotPassword({ email: email.value })
    message.value = '如果该邮箱已注册，重置说明已经生成。'
    debugToken.value = result.debugToken ?? ''
  } catch {
    message.value = '请求暂时无法处理，请稍后重试。'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell kicker="ACCOUNT RECOVERY" title="找回密码" description="输入注册邮箱，我们会生成一次性重置凭证。">
    <form @submit.prevent="submit">
      <label>邮箱<span><Mail :size="18" /><input v-model="email" type="email" autocomplete="email" required /></span></label>
      <p v-if="message" class="auth-message" role="status">{{ message }}</p>
      <button class="login-submit" type="submit" :disabled="loading"><LoaderCircle v-if="loading" class="spin" :size="18" />{{ loading ? '正在提交…' : '发送重置说明' }}</button>
    </form>
    <RouterLink v-if="debugToken" class="auth-debug-link" :to="{ path: '/reset-password', query: { token: debugToken } }">开发环境：使用重置凭证</RouterLink>
    <div class="auth-switch"><RouterLink to="/login">返回登录</RouterLink></div>
  </AuthShell>
</template>
