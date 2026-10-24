<script setup lang="ts">
import { CheckCircle2, LoaderCircle } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authState } from '../../stores/auth'
import { ensureWorkspaceContext, resetWorkspaceContext, selectWorkspace } from '../../stores/workspace'
import { acceptWorkspaceInvitation } from '../console/api'
import AuthShell from '../login/cmp/AuthShell.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const error = ref('')

async function accept() {
  const token = typeof route.params.token === 'string' ? route.params.token : ''
  if (!token) { error.value = '邀请链接无效'; return }
  loading.value = true
  error.value = ''
  try {
    const result = await acceptWorkspaceInvitation(token)
    if (authState.user) {
      resetWorkspaceContext()
      await ensureWorkspaceContext(authState.user.id)
      selectWorkspace(result.workspace.id)
    }
    await router.replace('/console/members')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '接受邀请失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell kicker="WORKSPACE INVITATION" title="加入工作区" :description="`当前登录账号：${authState.user?.email ?? ''}`">
    <div class="grid gap-3.75">
      <div class="flex items-center gap-2.25 rounded-2.5 border border-white/8 bg-white/[.025] p-3 text-[11px] leading-[1.5] text-[#93a299]"><CheckCircle2 class="shrink-0 text-[#63e495]" :size="18" /><span>接受后将立即获得邀请指定的工作区权限。</span></div>
      <p v-if="error" class="m-0 text-center text-[11px] text-[#f4a5a5]" role="alert">{{ error }}</p>
      <button class="login-submit" type="button" :disabled="loading" @click="accept"><LoaderCircle v-if="loading" class="spin" :size="18" />{{ loading ? '正在加入…' : '接受邀请' }}</button>
      <RouterLink class="justify-self-center text-[10px] text-[#89daa2]" to="/console/members">返回控制台</RouterLink>
    </div>
  </AuthShell>
</template>
