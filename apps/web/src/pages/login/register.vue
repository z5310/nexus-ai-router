<script setup lang="ts">
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, UserRound } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { safeRedirect } from '../../lib/redirect'
import { signUp } from '../../stores/auth'
import AuthShell from './cmp/AuthShell.vue'

const router = useRouter()
const route = useRoute()
const name = ref('')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await signUp(name.value, email.value, password.value, true)
    await router.replace(safeRedirect(route.query.redirect))
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '注册失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell kicker="CREATE ACCOUNT" title="创建 Nexus 账户" description="注册后即可创建密钥、调用模型并查看用量。">
    <form @submit.prevent="submit">
      <label>姓名<span><UserRound :size="18" /><input v-model="name" autocomplete="name" minlength="2" required /></span></label>
      <label>邮箱<span><Mail :size="18" /><input v-model="email" type="email" autocomplete="email" required /></span></label>
      <label>密码<span><LockKeyhole :size="18" /><input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" minlength="10" required /><button type="button" aria-label="显示或隐藏密码" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="18" /><Eye v-else :size="18" /></button></span></label>
      <small class="auth-hint">至少 10 位，并包含大写字母、小写字母和数字。</small>
      <p v-if="error" class="login-error" role="alert">{{ error }}</p>
      <button class="login-submit" type="submit" :disabled="loading"><LoaderCircle v-if="loading" class="spin" :size="18" />{{ loading ? '正在创建…' : '创建并登录' }}</button>
    </form>
    <div class="auth-switch">已有账户？<RouterLink :to="{ path: '/login', query: { redirect: safeRedirect(route.query.redirect) } }">返回登录</RouterLink></div>
  </AuthShell>
</template>
