<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { Building2, ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-vue-next'
import { reactive, ref } from 'vue'
import AButton from 'ant-design-vue/es/button'
import AForm from 'ant-design-vue/es/form'
import AInput from 'ant-design-vue/es/input'
import AInputNumber from 'ant-design-vue/es/input-number'
import AModal from 'ant-design-vue/es/modal'
import ASelect, { SelectOption as ASelectOption } from 'ant-design-vue/es/select'
import ASwitch from 'ant-design-vue/es/switch'
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
  AModal.confirm({ title: '删除供应商', content: `确认删除供应商“${item.name}”？已绑定凭证或渠道时系统会阻止删除。`, okText: '确认删除', cancelText: '取消', okType: 'danger', onOk: () => removeMutation.mutateAsync(item.id) })
}
</script>

<template>
  <section class="overflow-hidden rounded-14px border border-white/9 bg-white/2">
    <header class="min-h-68px flex items-center justify-between gap-4 border-b border-white/7 px-18px py-4">
      <div><h2 class="m-0 text-15px">供应商目录</h2><p class="mb-0 mt-1 text-13px text-[#647268]">统一维护协议、官方接口地址与模型能力，凭证和渠道只能绑定已启用供应商。</p></div>
      <AButton class="h-36px px-4 text-13px font-700" @click="openCreate"><Plus :size="15" />新增供应商</AButton>
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
            <td><ASwitch :checked="item.enabled" :loading="statusMutation.isPending.value" checked-children="启用" un-checked-children="停用" @change="statusMutation.mutate({item,enabled:!item.enabled})" /></td>
            <td class="pr-14px text-right"><div class="inline-flex gap-2"><AButton type="text" class="h-8 w-8 p-0 text-[#77867c] hover:text-white" aria-label="编辑供应商" @click="openEdit(item)"><Pencil :size="15" /></AButton><AButton type="text" danger class="h-8 w-8 p-0" aria-label="删除供应商" @click="remove(item)"><Trash2 :size="15" /></AButton></div></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <AModal :open="dialog" :footer="null" :closable="false" :width="560" wrap-class-name="nexus-admin-modal" @cancel="dialog=false">
    <AForm class="p-1" @finish="submit">
      <header class="mb-5 flex items-start justify-between"><div><small class="text-12px font-700 tracking-2px text-emerald-300">PROVIDER REGISTRY</small><h2 class="mb-0 mt-2 text-22px">{{ editing?'编辑供应商':'新增供应商' }}</h2></div><AButton type="text" class="h-8 w-8 p-0 text-[#8d9b92]" @click="dialog=false"><X :size="17" /></AButton></header>
      <div class="grid gap-4">
        <div class="grid grid-cols-2 gap-3"><label class="grid gap-2 text-13px text-[#91a097]">显示名称<AInput v-model:value="form.name" required :maxlength="80" placeholder="OpenAI" class="h-11" /></label><label class="grid gap-2 text-13px text-[#91a097]">唯一标识<AInput v-model:value="form.code" required :disabled="Boolean(editing)" :maxlength="40" placeholder="openai" class="h-11 font-mono" /></label></div>
        <div class="grid grid-cols-[1fr_120px] gap-3"><label class="grid gap-2 text-13px text-[#91a097]">协议适配器<ASelect v-model:value="form.protocol" class="h-11"><ASelectOption value="openai_compatible">OpenAI 兼容</ASelectOption><ASelectOption value="anthropic">Anthropic</ASelectOption><ASelectOption value="google">Google</ASelectOption><ASelectOption value="custom">自定义</ASelectOption></ASelect></label><label class="grid gap-2 text-13px text-[#91a097]">排序<AInputNumber v-model:value="form.sortOrder" :min="0" :max="10000" class="h-11 w-full" /></label></div>
        <label class="grid gap-2 text-13px text-[#91a097]">API Base URL（仅作为平台配置元数据）<AInput v-model:value="form.baseUrl" type="url" :maxlength="500" placeholder="https://api.example.com/v1" class="h-11 font-mono" /></label>
        <label class="grid gap-2 text-13px text-[#91a097]">官方文档地址<AInput v-model:value="form.docsUrl" type="url" :maxlength="500" placeholder="https://docs.example.com" class="h-11" /></label>
        <fieldset class="m-0 border-0 p-0"><legend class="mb-2 text-13px text-[#91a097]">模型能力</legend><div class="flex flex-wrap gap-2"><AButton v-for="option in capabilityOptions" :key="option.value" ghost :class="['text-12px',form.capabilities.includes(option.value)?'border-emerald-300/25 bg-emerald-300/8 text-emerald-300':'text-[#7f8d84]']" @click="toggleCapability(option.value)">{{ option.label }}</AButton></div></fieldset>
        <label class="flex items-center justify-between gap-3 text-13px text-[#91a097]">创建后允许新增凭证与渠道<ASwitch v-model:checked="form.enabled" /></label>
      </div>
      <p v-if="errorMessage" class="mb-0 mt-4 text-13px text-red-300">{{ errorMessage }}</p>
      <footer class="mt-6 flex justify-end gap-3"><AButton ghost class="h-10 px-5 text-13px" @click="dialog=false">取消</AButton><AButton html-type="submit" class="h-10 px-5 text-13px font-700" :loading="createMutation.isPending.value||updateMutation.isPending.value">保存配置</AButton></footer>
    </AForm>
  </AModal>
</template>
