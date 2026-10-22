<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { SlidersHorizontal } from 'lucide-vue-next'
import { getWorkspaceSettings, saveWorkspaceSettings } from '../api'

const client = useQueryClient()
const name = ref('')
const currency = ref('CNY')
const saved = ref(false)
const query = useQuery({ queryKey: ['workspace-settings'], queryFn: ({ signal }) => getWorkspaceSettings(signal) })
watch(query.data, (value) => { if (value) { name.value = value.name; currency.value = value.defaultCurrency } }, { immediate: true })
const mutation = useMutation({
  mutationFn: () => saveWorkspaceSettings({ name: name.value.trim(), defaultCurrency: currency.value }),
  onSuccess: (value) => { client.setQueryData(['workspace-settings'], value); saved.value = true },
})
</script>

<template>
  <article class="console-surface settings-card">
    <div><SlidersHorizontal :size="19" /><div><h2>工作区设置</h2><p>修改当前工作区名称和默认展示币种。</p></div></div>
    <p v-if="query.isPending.value" role="status">正在加载工作区…</p>
    <p v-else-if="query.isError.value" role="alert">加载失败，请重试。<button @click="query.refetch()">重试</button></p>
    <form v-else @submit.prevent="saved = false; mutation.mutate()">
      <fieldset :disabled="mutation.isPending.value || !['owner', 'admin'].includes(query.data.value?.role ?? '')">
        <label>工作区名称<input v-model="name" required maxlength="100" @input="saved = false" /></label>
        <label>默认币种<select v-model="currency" @change="saved = false"><option value="CNY">CNY · ¥</option><option value="USD">USD · $</option></select></label>
        <button class="console-primary-action" type="submit" :disabled="!name.trim()">{{ mutation.isPending.value ? '正在保存…' : '保存设置' }}</button>
      </fieldset>
      <p v-if="!['owner', 'admin'].includes(query.data.value?.role ?? '')">仅所有者或管理员可修改设置。</p>
      <p v-if="mutation.isError.value" role="alert">{{ mutation.error.value?.message }}</p>
      <p v-if="saved" role="status">已保存到数据库。</p>
    </form>
  </article>
</template>

<style scoped>
fieldset { display: flex; flex-direction: column; gap: 16px; min-width: 0; margin: 0; padding: 0; border: 0; }
label { display: flex; flex-direction: column; gap: 8px; color: #c3d0c7; font-size: 14px; }
input, select { width: 100%; padding: 11px 12px; color: #fff; border: 1px solid rgba(255,255,255,.12); border-radius: 8px; background: #111d15; font: inherit; }
button { align-self: flex-start; }
fieldset:disabled { opacity: .65; }
</style>
