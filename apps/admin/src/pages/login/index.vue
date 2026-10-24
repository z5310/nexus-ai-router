<script setup lang="ts">
import { LockKeyhole, Mail } from 'lucide-vue-next'
import AButton from 'ant-design-vue/es/button'
import AInput from 'ant-design-vue/es/input'
import AInputPassword from 'ant-design-vue/es/input/Password'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BrandLogo } from '@gateway/ui'
import { signIn } from '../../lib/auth'

const route = useRoute()
const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref(route.query.forbidden ? '当前账户没有平台管理权限' : '')
async function submit() { error.value = ''; loading.value = true; try { const user = await signIn(email.value, password.value); if (user.role !== 'admin') throw new Error('当前账户没有平台管理权限'); await router.replace('/admin') } catch (reason) { error.value = reason instanceof Error ? reason.message : '登录失败' } finally { loading.value = false } }
</script>

<template>
  <main class="admin-login">
    <header><BrandLogo /><span>PLATFORM OPERATIONS</span></header>
    <form @submit.prevent="submit">
      <div class="login-icon"><LockKeyhole :size="24" /></div>
      <span>INTERNAL ACCESS</span>
      <h1>平台管理后台</h1>
      <p>供开发、运营与平台管理员维护用户、模型和服务配置。</p>
      <label>管理员邮箱<AInput v-model:value="email" size="large" type="email" autocomplete="email" required><template #prefix><Mail :size="17" /></template></AInput></label>
      <label>密码<AInputPassword v-model:value="password" size="large" autocomplete="current-password" required><template #prefix><LockKeyhole :size="17" /></template></AInputPassword></label>
      <p v-if="error" class="login-error">{{ error }}</p>
      <AButton html-type="submit" size="large" :loading="loading" :disabled="!email || !password">{{ loading ? '正在验证…' : '进入管理后台' }}</AButton>
      <small>普通客户请使用 Nexus Console 登录。</small>
    </form>
  </main>
</template>
