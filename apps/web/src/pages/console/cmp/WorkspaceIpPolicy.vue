<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { getWorkspaceIpPolicy, saveWorkspaceIpPolicy } from '../api'
import { activeWorkspace, workspaceQueryKey } from '../../../lib/workspace'

const client = useQueryClient()
const enabled = ref(false)
const text = ref('')
const saved = ref(false)
const query = useQuery({ queryKey: computed(() => workspaceQueryKey('workspace-ip-policy')), queryFn: ({ signal }) => getWorkspaceIpPolicy(signal) })
watch(query.data, (value) => { if(value) { enabled.value = value.enabled; text.value = value.networks.join('\n') } }, { immediate: true })
const mutation = useMutation({
  mutationFn: () => saveWorkspaceIpPolicy({ enabled: enabled.value, networks: text.value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean) }),
  onSuccess: (value) => { client.setQueryData(workspaceQueryKey('workspace-ip-policy'), value); saved.value = true },
})
</script>

<template>
  <article class="console-surface settings-card">
    <h2>API 来源 IP 限制</h2>
    <p>仅限制当前工作区 API Key 的模型接口访问，控制台不受影响。</p>
    <p v-if="query.isPending.value">正在加载…</p>
    <p v-else-if="query.isError.value" role="alert">加载失败。<button @click="query.refetch()">重试</button></p>
    <form v-else @submit.prevent="saved = false; mutation.mutate()">
      <fieldset :disabled="mutation.isPending.value || !['owner', 'admin'].includes(activeWorkspace?.role ?? '')">
        <label class="toggle-label"><input v-model="enabled" type="checkbox" @change="saved = false" />启用允许列表</label>
        <label>允许的 IP / CIDR 网段<textarea v-model="text" rows="6" placeholder="203.0.113.10&#10;198.51.100.0/24&#10;2001:db8::/32" @input="saved = false" /></label>
        <p>每行一项，最多 100 项。0.0.0.0/0 允许所有 IPv4，::/0 允许所有 IPv6。启用时不能为空。</p>
        <button type="submit" class="console-primary-action">{{ mutation.isPending.value ? '正在保存…' : '保存 IP 规则' }}</button>
      </fieldset>
      <p v-if="mutation.isError.value" role="alert">{{ mutation.error.value?.message }}</p>
      <p v-if="saved" role="status">已保存，对后续 API 请求立即生效。</p>
    </form>
  </article>
</template>

<style scoped>
fieldset { display:flex; flex-direction:column; gap:16px; min-width:0; border:0; padding:0; margin:18px 0 0; }
label { display:flex; flex-direction:column; gap:10px; color:#fff; font-size:14px; }
.toggle-label { flex-direction:row; align-items:center; }
textarea { width:100%; padding:12px; color:#fff; background:#111d15; border:1px solid rgba(255,255,255,.15); border-radius:8px; font:14px/1.6 monospace; resize:vertical; }
p { color:#a6b5ab; font-size:13px; line-height:1.6; }
button { align-self:flex-start; }
</style>
