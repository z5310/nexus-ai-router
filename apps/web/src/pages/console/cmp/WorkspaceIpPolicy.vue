<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { getWorkspaceIpPolicy, saveWorkspaceIpPolicy } from '../api'
import { activeWorkspace, workspaceQueryKey } from '../../../stores/workspace'
import { DataSkeleton, feedback } from '@gateway/ui'

const client = useQueryClient()
const enabled = ref(false)
const text = ref('')
const saved = ref(false)
const query = useQuery({ queryKey: computed(() => workspaceQueryKey('workspace-ip-policy')), queryFn: ({ signal }) => getWorkspaceIpPolicy(signal) })
watch(query.data, (value) => { if(value) { enabled.value = value.enabled; text.value = value.networks.join('\n') } }, { immediate: true })
const mutation = useMutation({
  mutationFn: () => saveWorkspaceIpPolicy({ enabled: enabled.value, networks: text.value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean) }),
  onSuccess: (value) => { client.setQueryData(workspaceQueryKey('workspace-ip-policy'), value); saved.value = true; feedback.success('IP 访问规则已保存') },
  onError: (error) => feedback.error(error, 'IP 访问规则保存失败'),
})
</script>

<template>
  <article class="console-surface settings-card">
    <h2>API 来源 IP 限制</h2>
    <p>仅限制当前工作区 API Key 的模型接口访问，控制台不受影响。</p>
    <DataSkeleton v-if="query.isPending.value" compact :rows="3" label="正在加载 IP 访问规则" />
    <p v-else-if="query.isError.value" role="alert">加载失败。<button @click="query.refetch()">重试</button></p>
    <form v-else @submit.prevent="saved = false; mutation.mutate()">
      <fieldset class="m-0 mt-4.5 flex min-w-0 flex-col gap-4 border-0 p-0" :disabled="mutation.isPending.value || !['owner', 'admin'].includes(activeWorkspace?.role ?? '')">
        <label class="flex flex-row items-center gap-2.5 text-sm text-white"><input v-model="enabled" type="checkbox" @change="saved = false" />启用允许列表</label>
        <label class="flex flex-col gap-2.5 text-sm text-white">允许的 IP / CIDR 网段<textarea v-model="text" class="w-full resize-y rounded-2 border border-white/15 bg-[#111d15] p-3 font-mono text-sm leading-[1.6] text-white outline-none" rows="6" placeholder="203.0.113.10&#10;198.51.100.0/24&#10;2001:db8::/32" @input="saved = false" /></label>
        <p class="text-[13px] leading-[1.6] text-[#a6b5ab]">每行一项，最多 100 项。0.0.0.0/0 允许所有 IPv4，::/0 允许所有 IPv6。启用时不能为空。</p>
        <button type="submit" class="console-primary-action self-start">{{ mutation.isPending.value ? '正在保存…' : '保存 IP 规则' }}</button>
      </fieldset>
      <p v-if="mutation.isError.value" role="alert">{{ mutation.error.value?.message }}</p>
      <p v-if="saved" role="status">已保存，对后续 API 请求立即生效。</p>
    </form>
  </article>
</template>
