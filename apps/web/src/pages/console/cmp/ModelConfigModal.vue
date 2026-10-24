<script setup lang="ts">
import { Save, Trash2 } from 'lucide-vue-next'
import AButton from 'ant-design-vue/es/button'
import AInput from 'ant-design-vue/es/input'
import AInputNumber from 'ant-design-vue/es/input-number'
import ASelect, { SelectOption as ASelectOption } from 'ant-design-vue/es/select'
import ASwitch from 'ant-design-vue/es/switch'
import type { CatalogModel, WorkspaceModelConfig } from '@gateway/contracts'
import { computed, reactive, watch } from 'vue'
import type { CreateWorkspaceModelInput } from '../api/types'
import ModalShell from './ModalShell.vue'

const props = defineProps<{ open: boolean; busy: boolean; models: CatalogModel[]; editing?: WorkspaceModelConfig | null; error?: string }>()
const emit = defineEmits<{ close: []; submit: [value: CreateWorkspaceModelInput]; remove: [] }>()
const form = reactive<CreateWorkspaceModelInput>({ modelId: '', alias: '', priority: 50, rateLimitRpm: 60, dailyBudgetCny: null, enabled: true })
const dailyBudget = computed<number | undefined>({
  get: () => form.dailyBudgetCny ?? undefined,
  set: (value) => { form.dailyBudgetCny = value ?? null },
})
watch(() => [props.open, props.editing, props.models] as const, () => {
  if (!props.open) return
  const editing = props.editing
  form.modelId = editing?.modelId ?? props.models[0]?.id ?? ''
  form.alias = editing?.alias ?? ''
  form.priority = editing?.priority ?? 50
  form.rateLimitRpm = editing?.rateLimitRpm ?? 60
  form.dailyBudgetCny = editing?.dailyBudgetCny ?? null
  form.enabled = editing?.enabled ?? true
}, { immediate: true })
function submit() {
  const rawBudget = form.dailyBudgetCny as number | string | null | undefined
  emit('submit', {
    ...form,
    alias: form.alias?.trim() || undefined,
    dailyBudgetCny: rawBudget === '' || rawBudget == null ? null : Number(rawBudget),
  })
}
</script>

<template>
  <ModalShell v-if="open" :title="editing ? '配置工作区模型' : '添加工作区模型'" description="这里只影响当前工作区的别名、路由优先级、限流与预算，不会修改平台模型目录。" :busy="busy" @close="emit('close')">
    <form class="flex flex-col gap-3.75 px-[22px] pb-[22px] pt-5" @submit.prevent="submit">
      <label class="flex flex-wrap items-center gap-1.5 text-[11px] text-[#9ba89f]">模型<ASelect v-model:value="form.modelId" class="w-full" :disabled="Boolean(editing)"><ASelectOption v-for="model in models" :key="model.id" :value="model.id">{{ model.name }} · {{ model.provider }}</ASelectOption></ASelect></label>
      <label class="flex flex-wrap items-center gap-1.5 text-[11px] text-[#9ba89f]">工作区别名 <small class="text-[9px] text-[#59685e]">可选</small><AInput v-model:value="form.alias" class="w-full" :maxlength="120" placeholder="例如：主力推理模型" /></label>
      <div class="grid grid-cols-2 gap-2.5 max-sm:grid-cols-1"><label class="flex flex-wrap items-center gap-1.5 text-[11px] text-[#9ba89f]">路由优先级<AInputNumber v-model:value="form.priority" class="w-full" :min="1" :max="100" /></label><label class="flex flex-wrap items-center gap-1.5 text-[11px] text-[#9ba89f]">每分钟请求数<AInputNumber v-model:value="form.rateLimitRpm" class="w-full" :min="1" :max="100000" /></label></div>
      <label class="flex flex-wrap items-center gap-1.5 text-[11px] text-[#9ba89f]">每日预算（元）<small class="text-[9px] text-[#59685e]">留空表示不限制</small><AInputNumber v-model:value="dailyBudget" class="w-full" :min="0" :step="0.01" placeholder="不限" /></label>
      <label class="flex items-center justify-between rounded-2.5 border border-white/8 bg-white/2 p-3 text-[11px] text-[#9ba89f]"><span class="flex flex-col gap-1"><b class="text-[#dce7df]">启用模型</b><small>关闭后路由不会向该模型发送请求</small></span><ASwitch v-model:checked="form.enabled" /></label>
      <p v-if="error" class="m-0 text-[10px] text-[#ef9292]">{{ error }}</p>
      <footer class="flex items-center gap-2 pt-1.25 max-sm:flex-wrap"><AButton v-if="editing" class="max-sm:flex-1" danger :disabled="busy" @click="emit('remove')"><Trash2 :size="15" />移除</AButton><span class="flex-1 max-sm:hidden" /><AButton class="max-sm:flex-1" ghost :disabled="busy" @click="emit('close')">取消</AButton><AButton class="max-sm:flex-1" html-type="submit" :loading="busy" :disabled="!form.modelId"><Save :size="15" />{{ busy ? '正在保存…' : '保存配置' }}</AButton></footer>
    </form>
  </ModalShell>
</template>
