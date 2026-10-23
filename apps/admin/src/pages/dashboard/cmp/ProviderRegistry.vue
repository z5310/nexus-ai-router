<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { Building2, ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-vue-next'
import { reactive, ref } from 'vue'
import type { ModelType } from '@gateway/contracts'
import type { ProviderDefinition, ProviderProtocol } from '../api'
import { createProvider, deleteProvider, getProviders, updateProvider } from '../api'

const queryClient = useQueryClient()
const providers = useQuery({ queryKey: ['admin-providers'], queryFn: getProviders })
const dialog = ref(false)
const editing = ref<ProviderDefinition | null>(null)
const errorMessage = ref('')
const form = reactive({
  code: '', name: '', protocol: 'openai_compatible' as ProviderProtocol,
  baseUrl: '', docsUrl: '', capabilities: ['text'] as ModelType[], enabled: true, sortOrder: 100,
})
const capabilityOptions: Array<{ value: ModelType; label: string }> = [
  { value: 'text', label: '文本' }, { value: 'image', label: '图像' }, { value: 'video', label: '视频' },
  { value: 'audio', label: '音频' }, { value: 'embedding', label: '向量' },
]
const protocolLabels: Record<ProviderProtocol, string> = {
  openai_compatible: 'OpenAI 兼容', anthropic: 'Anthropic', google: 'Google', custom: '自定义',
}

const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-providers'] })
const createMutation = useMutation({
  mutationFn: () => createProvider({
    ...form, baseUrl: form.baseUrl.trim() || undefined, docsUrl: form.docsUrl.trim() || undefined,
  }),
  onSuccess: async () => { dialog.value = false; await invalidate() },
  onError: (error) => { errorMessage.value = error.message },
})
const updateMutation = useMutation({
  mutationFn: () => {
    if (!editing.value) throw new Error('未选择供应商')
    return updateProvider(editing.value.id, {
      name: form.name, protocol: form.protocol, baseUrl: form.baseUrl.trim() || null,
      docsUrl: form.docsUrl.trim() || null, capabilities: form.capabilities,
      enabled: form.enabled, sortOrder: form.sortOrder,
    })
  },
  onSuccess: async () => { dialog.value = false; await invalidate() },
  onError: (error) => { errorMessage.value = error.message },
})
const statusMutation = useMutation({
  mutationFn: ({ item, enabled }: { item: ProviderDefinition; enabled: boolean }) => updateProvider(item.id, { enabled }),
  onSuccess: invalidate,
  onError: (error) => { errorMessage.value = error.message },
})
const removeMutation = useMutation({
  mutationFn: deleteProvider, onSuccess: invalidate, onError: (error) => { errorMessage.value = error.message },
})

function openCreate() {
  editing.value = null
  errorMessage.value = ''
  Object.assign(form, { code: '', name: '', protocol: 'openai_compatible', baseUrl: '', docsUrl: '', capabilities: ['text'], enabled: true, sortOrder: 100 })
  dialog.value = true
}

function openEdit(item: ProviderDefinition) {
  editing.value = item
  errorMessage.value = ''
  Object.assign(form, { code: item.code, name: item.name, protocol: item.protocol, baseUrl: item.baseUrl ?? '', docsUrl: item.docsUrl ?? '', capabilities: [...item.capabilities], enabled: item.enabled, sortOrder: item.sortOrder })
  dialog.value = true
}

function toggleCapability(capability: ModelType) {
  const index = form.capabilities.indexOf(capability)
  if (index >= 0) form.capabilities.splice(index, 1)
  else form.capabilities.push(capability)
}

function submit() {
  if (!form.capabilities.length) { errorMessage.value = '至少选择一种模型能力'; return }
  if (editing.value) updateMutation.mutate()
  else createMutation.mutate()
}

function remove(item: ProviderDefinition) {
  if (window.confirm(`确认删除供应商“${item.name}”？已绑定凭证或渠道时系统会阻止删除。`)) removeMutation.mutate(item.id)
}
</script>

<template>
  <section class="overflow-hidden rounded-14px border border-white/9 bg-white/2">
    <header class="min-h-68px flex items-center justify-between gap-4 border-b border-white/7 px-18px py-4">
      <div><h2 class="m-0 text-15px">供应商目录</h2><p class="mb-0 mt-1 text-13px text-[#647268]">统一维护协议、官方接口地址与模型能力，凭证和渠道只能绑定已启用供应商。</p></div>
      <button class="h-36px flex items-center gap-2 rounded-9px border-0 bg-[#DCE7DE] px-4 text-13px font-700 text-[#07100a]" @click="openCreate"><Plus :size="15" />新增供应商</button>
    </header>
    <p v-if="errorMessage && !dialog" class="m-4 rounded-2 border border-red-400/20 bg-red-400/8 px-4 py-3 text-13px text-red-300">{{ errorMessage }}</p>
    <div class="overflow-x-auto">
      <table class="w-full min-w-900px border-collapse">
        <thead><tr class="text-left text-13px text-[#a6b5ab]"><th class="p-14px">供应商</th><th>协议</th><th>能力</th><th>API 地址</th><th>状态</th><th class="pr-14px text-right">操作</th></tr></thead>
        <tbody>
          <tr v-if="providers.isPending.value"><td colspan="6" class="p-8 text-center text-13px text-[#718078]">正在加载供应商…</td></tr>
          <tr v-else-if="!providers.data.value?.data.length"><td colspan="6" class="p-8 text-center text-13px text-[#718078]">尚未登记供应商。</td></tr>
          <tr v-for="item in providers.data.value?.data" :key="item.id" class="border-t border-white/6 text-13px text-[#c3d0c7]">
            <td class="p-14px"><div class="flex items-center gap-3"><span class="h-8 w-8 grid place-items-center rounded-8px bg-emerald-300/8 text-emerald-300"><Building2 :size="16" /></span><div class="grid gap-1"><b class="text-white">{{ item.name }}</b><small class="font-mono text-[#6f7e74]">{{ item.code }}</small></div></div></td>
            <td>{{ protocolLabels[item.protocol] }}</td>
            <td><div class="flex flex-wrap gap-1"><span v-for="capability in item.capabilities" :key="capability" class="rounded-full bg-white/5 px-2 py-1 text-11px text-[#91a097]">{{ capability }}</span></div></td>
            <td><a v-if="item.baseUrl" :href="item.docsUrl || item.baseUrl" target="_blank" rel="noreferrer" class="max-w-300px inline-flex items-center gap-1 truncate text-[#91a097] no-underline hover:text-emerald-300">{{ item.baseUrl }}<ExternalLink :size="12" /></a><span v-else class="text-[#657269]">未配置</span></td>
            <td><button :class="['rounded-7px border-0 px-2 py-1 text-12px',item.enabled?'bg-emerald-300/8 text-emerald-300':'bg-white/4 text-[#7c8980]']" @click="statusMutation.mutate({item,enabled:!item.enabled})">{{ item.enabled?'已启用':'已停用' }}</button></td>
            <td class="pr-14px text-right"><div class="inline-flex gap-2"><button class="h-8 w-8 inline-grid place-items-center rounded-8px border border-white/8 bg-transparent text-[#77867c] hover:text-white" aria-label="编辑供应商" @click="openEdit(item)"><Pencil :size="15" /></button><button class="h-8 w-8 inline-grid place-items-center rounded-8px border border-white/8 bg-transparent text-[#77867c] hover:text-red-300" aria-label="删除供应商" @click="remove(item)"><Trash2 :size="15" /></button></div></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <div v-if="dialog" class="fixed inset-0 z-50 grid place-items-center bg-black/65 p-5 backdrop-blur-8px" @click.self="dialog=false">
    <form class="w-full max-w-560px rounded-18px border border-white/10 bg-[#0b1510] p-5 shadow-2xl" @submit.prevent="submit">
      <header class="mb-5 flex items-start justify-between"><div><small class="text-12px font-700 tracking-2px text-emerald-300">PROVIDER REGISTRY</small><h2 class="mb-0 mt-2 text-22px">{{ editing?'编辑供应商':'新增供应商' }}</h2></div><button type="button" class="h-8 w-8 grid place-items-center rounded-8px border border-white/8 bg-transparent text-[#8d9b92]" @click="dialog=false"><X :size="17" /></button></header>
      <div class="grid gap-4">
        <div class="grid grid-cols-2 gap-3"><label class="grid gap-2 text-13px text-[#91a097]">显示名称<input v-model="form.name" required minlength="2" maxlength="80" placeholder="OpenAI" class="h-11 rounded-9px border border-white/9 bg-white/3 px-3 text-white outline-none focus:border-emerald-300/35"></label><label class="grid gap-2 text-13px text-[#91a097]">唯一标识<input v-model="form.code" required :disabled="Boolean(editing)" pattern="[a-z0-9][a-z0-9-]{1,39}" placeholder="openai" class="h-11 rounded-9px border border-white/9 bg-white/3 px-3 font-mono text-white outline-none disabled:opacity-45"></label></div>
        <div class="grid grid-cols-[1fr_120px] gap-3"><label class="grid gap-2 text-13px text-[#91a097]">协议适配器<select v-model="form.protocol" class="h-11 rounded-9px border border-white/9 bg-[#0f1a14] px-3 text-white outline-none"><option value="openai_compatible">OpenAI 兼容</option><option value="anthropic">Anthropic</option><option value="google">Google</option><option value="custom">自定义</option></select></label><label class="grid gap-2 text-13px text-[#91a097]">排序<input v-model.number="form.sortOrder" type="number" min="0" max="10000" required class="h-11 rounded-9px border border-white/9 bg-white/3 px-3 text-white outline-none"></label></div>
        <label class="grid gap-2 text-13px text-[#91a097]">API Base URL（仅作为平台配置元数据）<input v-model="form.baseUrl" type="url" maxlength="500" placeholder="https://api.example.com/v1" class="h-11 rounded-9px border border-white/9 bg-white/3 px-3 font-mono text-white outline-none"></label>
        <label class="grid gap-2 text-13px text-[#91a097]">官方文档地址<input v-model="form.docsUrl" type="url" maxlength="500" placeholder="https://docs.example.com" class="h-11 rounded-9px border border-white/9 bg-white/3 px-3 text-white outline-none"></label>
        <fieldset class="m-0 border-0 p-0"><legend class="mb-2 text-13px text-[#91a097]">模型能力</legend><div class="flex flex-wrap gap-2"><button v-for="option in capabilityOptions" :key="option.value" type="button" :class="['rounded-8px border px-3 py-2 text-12px',form.capabilities.includes(option.value)?'border-emerald-300/25 bg-emerald-300/8 text-emerald-300':'border-white/8 bg-transparent text-[#7f8d84]']" @click="toggleCapability(option.value)">{{ option.label }}</button></div></fieldset>
        <label class="flex items-center gap-2 text-13px text-[#91a097]"><input v-model="form.enabled" type="checkbox">创建后允许新增凭证与渠道</label>
      </div>
      <p v-if="errorMessage" class="mb-0 mt-4 text-13px text-red-300">{{ errorMessage }}</p>
      <footer class="mt-6 flex justify-end gap-3"><button type="button" class="h-10 rounded-9px border border-white/9 bg-transparent px-5 text-13px text-[#a5b3aa]" @click="dialog=false">取消</button><button class="h-10 rounded-9px border-0 bg-[#DCE7DE] px-5 text-13px font-700 text-[#07100a]" :disabled="createMutation.isPending.value||updateMutation.isPending.value">保存配置</button></footer>
    </form>
  </div>
</template>
