<script setup lang="ts">
import { CheckCircle2, LoaderCircle } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authState } from '../../lib/auth'
import { ensureWorkspaceContext, resetWorkspaceContext, selectWorkspace } from '../../lib/workspace'
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
    <div class="accept-invitation">
      <div><CheckCircle2 :size="18" /><span>接受后将立即获得邀请指定的工作区权限。</span></div>
      <p v-if="error" class="login-error" role="alert">{{ error }}</p>
      <button class="login-submit" type="button" :disabled="loading" @click="accept"><LoaderCircle v-if="loading" class="spin" :size="18" />{{ loading ? '正在加入…' : '接受邀请' }}</button>
      <RouterLink to="/console/members">返回控制台</RouterLink>
    </div>
  </AuthShell>
</template>

<style scoped>
.accept-invitation{display:grid;gap:15px}.accept-invitation>div{display:flex;align-items:center;gap:9px;padding:12px;color:#93a299;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(255,255,255,.025);font-size:11px;line-height:1.5}.accept-invitation>div svg{flex:0 0 auto;color:#63e495}.accept-invitation>a{justify-self:center;color:#89daa2;font-size:10px}.login-error{margin:0;color:#f4a5a5;font-size:11px;text-align:center}
</style>
