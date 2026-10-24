<script setup lang="ts">
import { LockKeyhole, Mail } from 'lucide-vue-next'
import AButton from 'ant-design-vue/es/button'
import AInput from 'ant-design-vue/es/input'
import AInputPassword from 'ant-design-vue/es/input/Password'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BrandLogo } from '@gateway/ui'
import { signIn } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref(route.query.forbidden ? '当前账户没有平台管理权限' : '')
async function submit() { error.value = ''; loading.value = true; try { const user = await signIn(email.value, password.value); if (user.role !== 'admin') throw new Error('当前账户没有平台管理权限'); await router.replace('/admin') } catch (reason) { error.value = reason instanceof Error ? reason.message : '登录失败' } finally { loading.value = false } }
</script>

<template>
  <main class="relative grid min-h-screen min-h-[100dvh] place-items-center overflow-hidden bg-[#070d09] px-6 py-[86px] max-md:px-4 max-md:py-[76px]">
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_4%,rgba(52,180,98,.13),transparent_38%)]" />
    <header class="absolute inset-x-6 top-[22px] z-1 flex items-center justify-between"><BrandLogo /><span class="text-[13px] tracking-[.16em] text-[#536359] max-md:hidden">PLATFORM OPERATIONS</span></header>
    <form class="relative z-1 mx-auto w-[min(430px,100%)] rounded-[18px] border border-[var(--nexus-line)] bg-white/[.018] px-8 pb-[27px] pt-[29px] max-md:px-[22px] max-md:pb-[23px] max-md:pt-[25px]" @submit.prevent="submit">
      <div class="grid h-10.5 w-10.5 place-items-center rounded-3 border border-[rgba(99,228,149,.2)] bg-[rgba(99,228,149,.07)] text-[#72e79d]"><LockKeyhole :size="19" /></div>
      <span class="mt-5 block text-[13px] font-700 tracking-[.16em] text-[#63e495]">INTERNAL ACCESS</span>
      <h1 class="mb-1.5 mt-2 text-[1.95rem] font-570 tracking-[-.045em]">平台管理后台</h1>
      <p class="mb-[19px] mt-0 text-[13px] leading-[1.65] text-[#a6b5ab]">供开发、运营与平台管理员维护用户、模型和服务配置。</p>
      <label class="mt-3 block text-[13px] text-[#9ba9a0]">管理员邮箱<AInput v-model:value="email" class="mt-1.5 text-[13px]" size="large" type="email" autocomplete="email" required><template #prefix><Mail :size="16" /></template></AInput></label>
      <label class="mt-3 block text-[13px] text-[#9ba9a0]">密码<AInputPassword v-model:value="password" class="mt-1.5 text-[13px]" size="large" autocomplete="current-password" required><template #prefix><LockKeyhole :size="16" /></template></AInputPassword></label>
      <p v-if="error" class="mb-[-5px] mt-2.5 text-[13px] text-[#ef9999]">{{ error }}</p>
      <AButton class="mt-4.5 h-10.5 w-full text-[13px] text-[#07100a] hover:brightness-106" html-type="submit" size="large" :loading="loading" :disabled="!email || !password">{{ loading ? '正在验证…' : '进入管理后台' }}</AButton>
      <small class="mt-3.5 block text-center text-[13px] text-[#a6b5ab]">普通客户请使用 Nexus Console 登录。</small>
    </form>
  </main>
</template>
