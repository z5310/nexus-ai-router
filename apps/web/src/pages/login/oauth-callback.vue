<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { restoreSession } from '../../stores/auth'
import { safeRedirect } from '../../lib/redirect'

const router = useRouter()
const error = ref('')
onMounted(async () => {
  const user = await restoreSession()
  if (!user) { error.value = '第三方登录失败，请返回重试。'; return }
  const target = safeRedirect(sessionStorage.getItem('nexus-login-return'))
  sessionStorage.removeItem('nexus-login-return')
  await router.replace(target)
})
</script>

<template><main class="oauth-callback"><div><LoaderCircle v-if="!error" class="spin" :size="22" /><span>{{ error || '正在完成第三方登录…' }}</span><RouterLink v-if="error" to="/login">返回登录</RouterLink></div></main></template>
