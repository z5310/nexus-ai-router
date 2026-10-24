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
    <form class="model-form" @submit.prevent="submit">
      <label>模型<ASelect v-model:value="form.modelId" :disabled="Boolean(editing)"><ASelectOption v-for="model in models" :key="model.id" :value="model.id">{{ model.name }} · {{ model.provider }}</ASelectOption></ASelect></label>
      <label>工作区别名 <small>可选</small><AInput v-model:value="form.alias" :maxlength="120" placeholder="例如：主力推理模型" /></label>
      <div class="model-form-grid"><label>路由优先级<AInputNumber v-model:value="form.priority" :min="1" :max="100" /></label><label>每分钟请求数<AInputNumber v-model:value="form.rateLimitRpm" :min="1" :max="100000" /></label></div>
      <label>每日预算（元）<small>留空表示不限制</small><AInputNumber v-model:value="dailyBudget" :min="0" :step="0.01" placeholder="不限" /></label>
      <label class="model-enabled"><span><b>启用模型</b><small>关闭后路由不会向该模型发送请求</small></span><ASwitch v-model:checked="form.enabled" /></label>
      <p v-if="error" class="form-error">{{ error }}</p>
      <footer><AButton v-if="editing" danger :disabled="busy" @click="emit('remove')"><Trash2 :size="15" />移除</AButton><span /><AButton ghost :disabled="busy" @click="emit('close')">取消</AButton><AButton html-type="submit" :loading="busy" :disabled="!form.modelId"><Save :size="15" />{{ busy ? '正在保存…' : '保存配置' }}</AButton></footer>
    </form>
  </ModalShell>
</template>

<style scoped>
.model-form { display: flex; flex-direction: column; gap: 15px; padding: 20px 22px 22px; }.model-form label { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; color: #9ba89f; font-size: 11px; }.model-form label > :deep(.ant-select),.model-form label > :deep(.ant-input),.model-form label > :deep(.ant-input-number) { width: 100%; }.model-form label > small { color: #59685e; font-size: 9px; }.model-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }.model-enabled { justify-content: space-between; padding: 12px; border: 1px solid rgba(255,255,255,.08); border-radius: 10px; background: rgba(255,255,255,.02); }.model-enabled span { display: flex; flex-direction: column; gap: 4px; }.model-enabled b { color: #dce7df; }.model-form footer { display: flex; align-items: center; gap: 8px; padding-top: 5px; }.model-form footer span { flex: 1; }.form-error { margin: 0; color: #ef9292; font-size: 10px; }
@media(max-width:560px){.model-form-grid{grid-template-columns:1fr}.model-form footer{flex-wrap:wrap}.model-form footer span{display:none}.model-form footer button{flex:1}}
</style>
