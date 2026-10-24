<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { SlidersHorizontal } from 'lucide-vue-next'
import { getWorkspaceSettings, saveWorkspaceSettings } from '../api'
import { updateWorkspaceContext, workspaceQueryKey } from '../../../stores/workspace'
import { DataSkeleton, feedback } from '@gateway/ui'

const client = useQueryClient()
const name = ref('')
const currency = ref('CNY')
const saved = ref(false)
const settingsKey = computed(() => workspaceQueryKey('workspace-settings'))
const query = useQuery({ queryKey: settingsKey, queryFn: ({ signal }) => getWorkspaceSettings(signal) })
watch(query.data, (value) => { if (value) { name.value = value.name; currency.value = value.defaultCurrency } }, { immediate: true })
const mutation = useMutation({
  mutationFn: () => saveWorkspaceSettings({ name: name.value.trim(), defaultCurrency: currency.value }),
  onSuccess: (value) => { client.setQueryData(workspaceQueryKey('workspace-settings'), value); updateWorkspaceContext(value); saved.value = true; feedback.success('工作区设置已保存') },
  onError: (error) => feedback.error(error, '工作区设置保存失败'),
})
</script>

<template>
  <article class="console-surface settings-card">
    <div><SlidersHorizontal :size="19" /><div><h2>工作区设置</h2><p>修改当前工作区名称和默认展示币种。</p></div></div>
    <DataSkeleton v-if="query.isPending.value" compact :rows="3" label="正在加载工作区设置" />
    <p v-else-if="query.isError.value" role="alert">加载失败，请重试。<button @click="query.refetch()">重试</button></p>
    <form v-else @submit.prevent="saved = false; mutation.mutate()">
      <fieldset class="m-0 flex min-w-0 flex-col gap-4 border-0 p-0 disabled:opacity-65" :disabled="mutation.isPending.value || !['owner', 'admin'].includes(query.data.value?.role ?? '')">
        <label class="flex flex-col gap-2 text-sm text-[#c3d0c7]">工作区名称<input v-model="name" class="w-full rounded-2 border border-white/12 bg-[#111d15] px-3 py-2.75 text-white outline-none" required maxlength="100" @input="saved = false" /></label>
        <label class="flex flex-col gap-2 text-sm text-[#c3d0c7]">默认币种<select v-model="currency" class="w-full rounded-2 border border-white/12 bg-[#111d15] px-3 py-2.75 text-white outline-none" @change="saved = false"><option value="CNY">CNY · ¥</option><option value="USD">USD · $</option></select></label>
        <button class="console-primary-action self-start" type="submit" :disabled="!name.trim()">{{ mutation.isPending.value ? '正在保存…' : '保存设置' }}</button>
      </fieldset>
      <p v-if="!['owner', 'admin'].includes(query.data.value?.role ?? '')">仅所有者或管理员可修改设置。</p>
      <p v-if="mutation.isError.value" role="alert">{{ mutation.error.value?.message }}</p>
      <p v-if="saved" role="status">已保存到数据库。</p>
    </form>
  </article>
</template>
