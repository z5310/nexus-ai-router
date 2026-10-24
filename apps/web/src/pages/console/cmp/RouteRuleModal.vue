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
    <form class="flex flex-col gap-3.25 px-[22px] pb-[22px] pt-5" @submit.prevent="submit">
      <label class="flex flex-col gap-1.75 text-[11px] text-[#9ba89f]">{{ t('consoleSections.routeName') }}<AInput v-model:value="form.name" minlength="2" :maxlength="80" autofocus :placeholder="t('consoleSections.routeNamePlaceholder')" /></label>
      <div class="grid grid-cols-2 gap-2.5 max-sm:grid-cols-1">
        <label class="flex flex-col gap-1.75 text-[11px] text-[#9ba89f]">{{ t('consoleSections.matchType') }}<ASelect v-model:value="form.matchType" class="w-full"><ASelectOption value="all">{{ t('consoleSections.allRequests') }}</ASelectOption><ASelectOption value="text">{{ t('common.types.text') }}</ASelectOption><ASelectOption value="image">{{ t('common.types.image') }}</ASelectOption><ASelectOption value="video">{{ t('common.types.video') }}</ASelectOption><ASelectOption value="audio">{{ t('common.types.audio') }}</ASelectOption><ASelectOption value="embedding">{{ t('common.types.embedding') }}</ASelectOption></ASelect></label>
        <label class="flex flex-col gap-1.75 text-[11px] text-[#9ba89f]">{{ t('consoleSections.strategy') }}<ASelect v-model:value="form.strategy" class="w-full"><ASelectOption value="priority">{{ t('consoleSections.priorityStrategy') }}</ASelectOption><ASelectOption value="lowest_cost">{{ t('consoleSections.lowestCost') }}</ASelectOption><ASelectOption value="lowest_latency">{{ t('consoleSections.lowestLatency') }}</ASelectOption></ASelect></label>
      </div>
      <label class="flex flex-col gap-1.75 text-[11px] text-[#9ba89f]">{{ t('consoleSections.primaryModel') }}<ASelect v-model:value="form.primaryModelId" class="w-full" :placeholder="t('consoleSections.selectModel')"><ASelectOption v-for="model in models.filter((item) => item.enabled)" :key="model.id" :value="model.id">{{ model.alias || model.name }}</ASelectOption></ASelect></label>
      <label class="flex flex-col gap-1.75 text-[11px] text-[#9ba89f]">{{ t('consoleSections.fallbackModel') }}<ASelect v-model:value="fallbackModelId" class="w-full" allow-clear :placeholder="t('consoleSections.noFallback')"><ASelectOption v-for="model in models.filter((item) => item.enabled && item.id !== form.primaryModelId)" :key="model.id" :value="model.id">{{ model.alias || model.name }}</ASelectOption></ASelect></label>
      <label class="flex flex-col gap-1.75 text-[11px] text-[#9ba89f]">{{ t('consoleSections.trafficPercent') }}<AInputNumber v-model:value="form.trafficPercent" class="w-full" :min="1" :max="100" /></label>
      <label class="flex items-center justify-between rounded-2.5 border border-white/8 bg-white/2 p-3 text-[11px] text-[#9ba89f]"><span class="flex flex-col gap-1"><b class="text-[#dce7df]">{{ t('consoleSections.enableRoute') }}</b><small class="text-[9px] text-[#59685e]">{{ t('consoleSections.enableRouteHint') }}</small></span><ASwitch v-model:checked="form.enabled" /></label>
      <p v-if="error" class="m-0 text-[10px] text-[#ef9292]">{{ error }}</p>
      <footer class="flex items-center gap-2 pt-1.25 max-sm:flex-wrap"><AButton v-if="editing" class="max-sm:flex-1" danger :disabled="busy" @click="emit('remove')"><Trash2 :size="15" />{{ t('consoleSections.removeRoute') }}</AButton><span class="flex-1 max-sm:hidden" /><AButton class="max-sm:flex-1" ghost :disabled="busy" @click="emit('close')">{{ t('admin.cancel') }}</AButton><AButton class="max-sm:flex-1" html-type="submit" :loading="busy" :disabled="!form.name.trim() || !form.primaryModelId"><Save :size="15" />{{ busy ? t('admin.saving') : t('consoleSections.saveRoute') }}</AButton></footer>
    </form>
  </ModalShell>
</template>
