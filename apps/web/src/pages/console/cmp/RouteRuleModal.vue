<script setup lang="ts">
import { Save, Trash2 } from 'lucide-vue-next'
import { reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RouteRule, WorkspaceModelConfig } from '../api'
import type { CreateRouteRuleInput } from '../api/types'
import ModalShell from './ModalShell.vue'

const props = defineProps<{ open: boolean; busy: boolean; models: WorkspaceModelConfig[]; editing: RouteRule | null; error?: string }>()
const emit = defineEmits<{ close: []; submit: [value: CreateRouteRuleInput]; remove: [] }>()
const { t } = useI18n()
const form = reactive<CreateRouteRuleInput>({ name: '', matchType: 'all', strategy: 'priority', primaryModelId: '', fallbackModelId: null, trafficPercent: 100, enabled: true })

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
      <label>{{ t('consoleSections.routeName') }}<input v-model.trim="form.name" minlength="2" maxlength="80" required autofocus :placeholder="t('consoleSections.routeNamePlaceholder')" /></label>
      <div class="route-form-grid">
        <label>{{ t('consoleSections.matchType') }}<select v-model="form.matchType"><option value="all">{{ t('consoleSections.allRequests') }}</option><option value="text">{{ t('common.types.text') }}</option><option value="image">{{ t('common.types.image') }}</option><option value="video">{{ t('common.types.video') }}</option><option value="audio">{{ t('common.types.audio') }}</option><option value="embedding">{{ t('common.types.embedding') }}</option></select></label>
        <label>{{ t('consoleSections.strategy') }}<select v-model="form.strategy"><option value="priority">{{ t('consoleSections.priorityStrategy') }}</option><option value="lowest_cost">{{ t('consoleSections.lowestCost') }}</option><option value="lowest_latency">{{ t('consoleSections.lowestLatency') }}</option></select></label>
      </div>
      <label>{{ t('consoleSections.primaryModel') }}<select v-model="form.primaryModelId" required><option disabled value="">{{ t('consoleSections.selectModel') }}</option><option v-for="model in models.filter((item) => item.enabled)" :key="model.id" :value="model.id">{{ model.alias || model.name }}</option></select></label>
      <label>{{ t('consoleSections.fallbackModel') }}<select v-model="form.fallbackModelId"><option :value="null">{{ t('consoleSections.noFallback') }}</option><option v-for="model in models.filter((item) => item.enabled && item.id !== form.primaryModelId)" :key="model.id" :value="model.id">{{ model.alias || model.name }}</option></select></label>
      <label>{{ t('consoleSections.trafficPercent') }}<input v-model.number="form.trafficPercent" type="number" min="1" max="100" required /></label>
      <label class="route-enabled"><span><b>{{ t('consoleSections.enableRoute') }}</b><small>{{ t('consoleSections.enableRouteHint') }}</small></span><input v-model="form.enabled" type="checkbox" /></label>
      <p v-if="error" class="form-error">{{ error }}</p>
      <footer><button v-if="editing" type="button" class="remove-action" :disabled="busy" @click="emit('remove')"><Trash2 :size="15" />{{ t('consoleSections.removeRoute') }}</button><span /><button type="button" class="ghost-action" :disabled="busy" @click="emit('close')">{{ t('admin.cancel') }}</button><button type="submit" class="white-action" :disabled="busy || !form.name || !form.primaryModelId"><Save :size="15" />{{ busy ? t('admin.saving') : t('consoleSections.saveRoute') }}</button></footer>
    </form>
  </ModalShell>
</template>

<style scoped>
.route-form { display: flex; flex-direction: column; gap: 13px; padding: 20px 22px 22px; }.route-form label { display: flex; flex-direction: column; gap: 7px; color: #9ba89f; font-size: 11px; }.route-form input:not([type="checkbox"]),.route-form select { width: 100%; height: 42px; padding: 0 12px; color: #e2ece5; border: 1px solid rgba(255,255,255,.1); border-radius: 9px; outline: 0; background: #111d15; }.route-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }.route-enabled { flex-direction: row !important; align-items: center; justify-content: space-between; padding: 12px; border: 1px solid rgba(255,255,255,.08); border-radius: 10px; background: rgba(255,255,255,.02); }.route-enabled span { display: flex; flex-direction: column; gap: 4px; }.route-enabled b { color: #dce7df; }.route-enabled small { color: #59685e; font-size: 9px; }.route-enabled input { accent-color: #63e495; }.route-form footer { display: flex; align-items: center; gap: 8px; padding-top: 5px; }.route-form footer span { flex: 1; }.white-action,.ghost-action,.remove-action { min-height: 39px; display: inline-flex; align-items: center; gap: 6px; padding: 0 14px; border-radius: 9px; font-size: 10px; font-weight: 700; }.white-action { color: #08110b; border: 0; background: var(--nexus-button); }.ghost-action { color: #9aa79e; border: 1px solid rgba(255,255,255,.09); background: transparent; }.remove-action { color: #ee9999; border: 0; background: rgba(238,110,110,.07); }.form-error { margin: 0; color: #ef9292; font-size: 10px; }
@media(max-width:560px){.route-form-grid{grid-template-columns:1fr}.route-form footer{flex-wrap:wrap}.route-form footer span{display:none}.route-form footer button{flex:1}}
</style>
