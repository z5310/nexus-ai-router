<script setup lang="ts">
import { Save, Trash2 } from 'lucide-vue-next'
import AButton from 'ant-design-vue/es/button'
import AInput from 'ant-design-vue/es/input'
import AInputNumber from 'ant-design-vue/es/input-number'
import ASelect, { SelectOption as ASelectOption } from 'ant-design-vue/es/select'
import ASwitch from 'ant-design-vue/es/switch'
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RouteRule, WorkspaceModelConfig } from '../api'
import type { CreateRouteRuleInput } from '../api/types'
import ModalShell from './ModalShell.vue'

const props = defineProps<{ open: boolean; busy: boolean; models: WorkspaceModelConfig[]; editing: RouteRule | null; error?: string }>()
const emit = defineEmits<{ close: []; submit: [value: CreateRouteRuleInput]; remove: [] }>()
const { t } = useI18n()
const form = reactive<CreateRouteRuleInput>({ name: '', matchType: 'all', strategy: 'priority', primaryModelId: '', fallbackModelId: null, trafficPercent: 100, enabled: true })
const fallbackModelId = computed<string | undefined>({
  get: () => form.fallbackModelId ?? undefined,
  set: (value) => { form.fallbackModelId = value || null },
})

watch(() => props.open, (open) => {
  if (!open) return
  Object.assign(form, props.editing ? {
    name: props.editing.name,
    matchType: props.editing.matchType,
    strategy: props.editing.strategy,
    primaryModelId: props.editing.primaryModelId,
    fallbackModelId: props.editing.fallbackModelId,
    trafficPercent: props.editing.trafficPercent,
    enabled: props.editing.enabled,
  } : { name: '', matchType: 'all', strategy: 'priority', primaryModelId: props.models.find((model) => model.enabled)?.id ?? '', fallbackModelId: null, trafficPercent: 100, enabled: true })
})

function submit() {
  emit('submit', { ...form, fallbackModelId: form.fallbackModelId || null })
}
</script>

<template>
  <ModalShell v-if="open" :title="editing ? t('consoleSections.editRoute') : t('consoleSections.routes.action')" :description="t('consoleSections.routeFormDesc')" :busy="busy" @close="emit('close')">
    <form class="route-form" @submit.prevent="submit">
      <label>{{ t('consoleSections.routeName') }}<AInput v-model:value="form.name" minlength="2" :maxlength="80" autofocus :placeholder="t('consoleSections.routeNamePlaceholder')" /></label>
      <div class="route-form-grid">
        <label>{{ t('consoleSections.matchType') }}<ASelect v-model:value="form.matchType"><ASelectOption value="all">{{ t('consoleSections.allRequests') }}</ASelectOption><ASelectOption value="text">{{ t('common.types.text') }}</ASelectOption><ASelectOption value="image">{{ t('common.types.image') }}</ASelectOption><ASelectOption value="video">{{ t('common.types.video') }}</ASelectOption><ASelectOption value="audio">{{ t('common.types.audio') }}</ASelectOption><ASelectOption value="embedding">{{ t('common.types.embedding') }}</ASelectOption></ASelect></label>
        <label>{{ t('consoleSections.strategy') }}<ASelect v-model:value="form.strategy"><ASelectOption value="priority">{{ t('consoleSections.priorityStrategy') }}</ASelectOption><ASelectOption value="lowest_cost">{{ t('consoleSections.lowestCost') }}</ASelectOption><ASelectOption value="lowest_latency">{{ t('consoleSections.lowestLatency') }}</ASelectOption></ASelect></label>
      </div>
      <label>{{ t('consoleSections.primaryModel') }}<ASelect v-model:value="form.primaryModelId" :placeholder="t('consoleSections.selectModel')"><ASelectOption v-for="model in models.filter((item) => item.enabled)" :key="model.id" :value="model.id">{{ model.alias || model.name }}</ASelectOption></ASelect></label>
      <label>{{ t('consoleSections.fallbackModel') }}<ASelect v-model:value="fallbackModelId" allow-clear :placeholder="t('consoleSections.noFallback')"><ASelectOption v-for="model in models.filter((item) => item.enabled && item.id !== form.primaryModelId)" :key="model.id" :value="model.id">{{ model.alias || model.name }}</ASelectOption></ASelect></label>
      <label>{{ t('consoleSections.trafficPercent') }}<AInputNumber v-model:value="form.trafficPercent" :min="1" :max="100" /></label>
      <label class="route-enabled"><span><b>{{ t('consoleSections.enableRoute') }}</b><small>{{ t('consoleSections.enableRouteHint') }}</small></span><ASwitch v-model:checked="form.enabled" /></label>
      <p v-if="error" class="form-error">{{ error }}</p>
      <footer><AButton v-if="editing" danger :disabled="busy" @click="emit('remove')"><Trash2 :size="15" />{{ t('consoleSections.removeRoute') }}</AButton><span /><AButton ghost :disabled="busy" @click="emit('close')">{{ t('admin.cancel') }}</AButton><AButton html-type="submit" :loading="busy" :disabled="!form.name.trim() || !form.primaryModelId"><Save :size="15" />{{ busy ? t('admin.saving') : t('consoleSections.saveRoute') }}</AButton></footer>
    </form>
  </ModalShell>
</template>

<style scoped>
.route-form { display: flex; flex-direction: column; gap: 13px; padding: 20px 22px 22px; }.route-form label { display: flex; flex-direction: column; gap: 7px; color: #9ba89f; font-size: 11px; }.route-form label > :deep(.ant-select),.route-form label > :deep(.ant-input),.route-form label > :deep(.ant-input-number) { width: 100%; }.route-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }.route-enabled { flex-direction: row !important; align-items: center; justify-content: space-between; padding: 12px; border: 1px solid rgba(255,255,255,.08); border-radius: 10px; background: rgba(255,255,255,.02); }.route-enabled span { display: flex; flex-direction: column; gap: 4px; }.route-enabled b { color: #dce7df; }.route-enabled small { color: #59685e; font-size: 9px; }.route-form footer { display: flex; align-items: center; gap: 8px; padding-top: 5px; }.route-form footer span { flex: 1; }.form-error { margin: 0; color: #ef9292; font-size: 10px; }
@media(max-width:560px){.route-form-grid{grid-template-columns:1fr}.route-form footer{flex-wrap:wrap}.route-form footer span{display:none}.route-form footer button{flex:1}}
</style>
