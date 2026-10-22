<script setup lang="ts">
import { Check, MoreHorizontal, Pencil, Plus, Route as RouteIcon, ShieldCheck, SlidersHorizontal, Trash2 } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { CreateApiKeyResponse, RequestLogListResponse, RouteRule, WorkspaceModelConfig } from './api'
import ConsoleShell from './cmp/ConsoleShell.vue'
import { models as fallbackModels } from '../../data/models'
import ApiKeyModal from './cmp/ApiKeyModal.vue'
import ModelConfigModal from './cmp/ModelConfigModal.vue'
import RouteRuleModal from './cmp/RouteRuleModal.vue'
import { createApiKey, createConsoleModel, createRouteRule, getApiKeys, getCatalogModels, getConsoleModels, getRequestLogs, getRouteRules, removeConsoleModel, removeRouteRule, revokeApiKey, updateConsoleModel, updateRouteRule } from './api'
import type { CreateRouteRuleInput, CreateWorkspaceModelInput } from './api/types'

type ConsoleSection = 'models' | 'routes' | 'keys' | 'logs' | 'billing' | 'members' | 'settings'
const route = useRoute()
const { t } = useI18n()
const queryClient = useQueryClient()
const search = ref('')
const section = computed(() => route.meta.section as ConsoleSection)
const modelQuery = useQuery({ queryKey: ['console-models'], queryFn: ({ signal }) => getConsoleModels(signal), staleTime: 60_000, enabled: computed(() => section.value === 'models' || section.value === 'routes'), retry: 1 })
const catalogQuery = useQuery({ queryKey: ['catalog-models'], queryFn: ({ signal }) => getCatalogModels(signal), staleTime: 60_000, enabled: computed(() => section.value === 'models'), retry: 1 })
const keyQuery = useQuery({ queryKey: ['api-keys'], queryFn: ({ signal }) => getApiKeys(signal), staleTime: 30_000, enabled: computed(() => section.value === 'keys'), retry: 1 })
const logQuery = useQuery({ queryKey: ['console-request-logs'], queryFn: ({ signal }) => getRequestLogs(signal), staleTime: 30_000, enabled: computed(() => section.value === 'logs'), retry: 1 })
const routeQuery = useQuery({ queryKey: ['console-routes'], queryFn: ({ signal }) => getRouteRules(signal), staleTime: 30_000, enabled: computed(() => section.value === 'routes'), retry: 1 })

const fallbackLogs: RequestLogListResponse['data'] = [
  { id: '1', requestId: 'req_9ab2f3', modelId: 'openai/gpt-6.1-sol', modelName: 'GPT-6.1 Sol', status: 'success', latencyMs: 384, tokenCount: 1842, costCny: .0284, createdAt: new Date().toISOString() },
  { id: '2', requestId: 'req_8fc12a', modelId: 'deepseek/deepseek-v4.1-flash', modelName: 'DeepSeek V4.1 Flash', status: 'success', latencyMs: 218, tokenCount: 920, costCny: .0038, createdAt: new Date().toISOString() },
  { id: '3', requestId: 'req_failed12', modelId: 'anthropic/claude-sonnet-5.5', modelName: 'Claude Sonnet 5.5', status: 'failed', latencyMs: 10000, tokenCount: 0, costCny: 0, createdAt: new Date().toISOString() },
]
const filteredModels = computed(() => {
  const keyword = search.value.toLowerCase()
  return (modelQuery.data.value?.data ?? []).filter((item) => !keyword || `${item.name} ${item.alias ?? ''} ${item.slug} ${item.provider}`.toLowerCase().includes(keyword))
})
const filteredLogs = computed(() => {
  const keyword = search.value.toLowerCase()
  return (logQuery.data.value?.data ?? fallbackLogs).filter((item) => !keyword || `${item.requestId} ${item.modelName} ${item.modelId}`.toLowerCase().includes(keyword))
})
const filteredRoutes = computed(() => {
  const keyword = search.value.toLowerCase()
  return (routeQuery.data.value?.data ?? []).filter((item) => !keyword || `${item.name} ${item.primaryModelName} ${item.fallbackModelName ?? ''}`.toLowerCase().includes(keyword))
})
const members = [
  { name: '林宇', email: 'linyu@nexus.cn', role: t('consoleSections.owner'), status: t('common.stable') },
  { name: '陈晓', email: 'chenxiao@nexus.cn', role: t('consoleSections.developer'), status: t('common.stable') },
  { name: '王宁', email: 'wangning@nexus.cn', role: t('consoleSections.finance'), status: t('consoleSections.invited') },
]
const title = computed(() => t(`consoleSections.${section.value}.title`))
const description = computed(() => t(`consoleSections.${section.value}.description`))
const isFallback = computed(() => section.value === 'models' ? modelQuery.isError.value : section.value === 'routes' ? routeQuery.isError.value : section.value === 'logs' ? logQuery.isError.value : false)
const isLoading = computed(() => section.value === 'models' ? modelQuery.isLoading.value : section.value === 'routes' ? routeQuery.isLoading.value : section.value === 'keys' ? keyQuery.isLoading.value : section.value === 'logs' ? logQuery.isLoading.value : false)
const keyModalOpen = ref(false)
const createdKey = ref<CreateApiKeyResponse | null>(null)
const keyError = ref('')
const modelModalOpen = ref(false)
const editingModel = ref<WorkspaceModelConfig | null>(null)
const modelError = ref('')
const routeModalOpen = ref(false)
const editingRoute = ref<RouteRule | null>(null)
const routeError = ref('')
const configuredIds = computed(() => new Set((modelQuery.data.value?.data ?? []).map((item) => item.modelId)))
const availableCatalogModels = computed(() => (catalogQuery.data.value?.data ?? fallbackModels).filter((model) => !configuredIds.value.has(model.id)))
const modalModels = computed(() => editingModel.value ? (catalogQuery.data.value?.data ?? fallbackModels).filter((model) => model.id === editingModel.value?.modelId) : availableCatalogModels.value)

const keyMutation = useMutation({
  mutationFn: (name: string) => createApiKey({ name }),
  onSuccess: async (key) => { createdKey.value = key; await queryClient.invalidateQueries({ queryKey: ['api-keys'] }) },
  onError: (error) => { keyError.value = error instanceof Error ? error.message : t('consoleSections.saveFailed') },
})
const modelMutation = useMutation({
  mutationFn: (value: CreateWorkspaceModelInput) => editingModel.value ? updateConsoleModel(editingModel.value.id, value) : createConsoleModel(value),
  onSuccess: async () => { modelModalOpen.value = false; editingModel.value = null; await queryClient.invalidateQueries({ queryKey: ['console-models'] }) },
  onError: (error) => { modelError.value = error instanceof Error ? error.message : t('consoleSections.saveFailed') },
})
const removeModelMutation = useMutation({ mutationFn: (id: string) => removeConsoleModel(id), onSuccess: async () => { modelModalOpen.value = false; editingModel.value = null; await queryClient.invalidateQueries({ queryKey: ['console-models'] }) } })
const routeMutation = useMutation({
  mutationFn: (value: CreateRouteRuleInput) => editingRoute.value ? updateRouteRule(editingRoute.value.id, value) : createRouteRule(value),
  onSuccess: async () => { routeModalOpen.value = false; editingRoute.value = null; await queryClient.invalidateQueries({ queryKey: ['console-routes'] }) },
  onError: (error) => { routeError.value = error instanceof Error ? error.message : t('consoleSections.saveFailed') },
})
const removeRouteMutation = useMutation({ mutationFn: (id: string) => removeRouteRule(id), onSuccess: async () => { routeModalOpen.value = false; editingRoute.value = null; await queryClient.invalidateQueries({ queryKey: ['console-routes'] }) } })

function openKeyModal() { createdKey.value = null; keyError.value = ''; keyModalOpen.value = true }
function closeKeyModal() { keyModalOpen.value = false; createdKey.value = null }
function openModelModal(model?: WorkspaceModelConfig) { editingModel.value = model ?? null; modelError.value = ''; modelModalOpen.value = true }
function openRouteModal(rule?: RouteRule) { editingRoute.value = rule ?? null; routeError.value = ''; routeModalOpen.value = true }
function handleSectionAction() { if (section.value === 'keys') openKeyModal(); else if (section.value === 'models') openModelModal(); else if (section.value === 'routes') openRouteModal() }
function revokeKey(id: string) { if (window.confirm(t('consoleSections.revokeKeyConfirm'))) revokeApiKey(id).then(() => queryClient.invalidateQueries({ queryKey: ['api-keys'] })) }
function removeModel() { if (editingModel.value && window.confirm(t('consoleSections.removeModelConfirm'))) removeModelMutation.mutate(editingModel.value.id) }
function removeRoute() { if (editingRoute.value && window.confirm(t('consoleSections.removeRouteConfirm'))) removeRouteMutation.mutate(editingRoute.value.id) }
const shortDate = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value)) : '—'
</script>

<template>
  <ConsoleShell v-model:search="search">
    <div class="console-title console-section-title"><div><p>NEXUS CONSOLE</p><h1>{{ title }}</h1><span>{{ description }}</span></div><button v-if="section === 'models' || section === 'routes' || section === 'keys'" class="console-primary-action" @click="handleSectionAction"><Plus :size="15" /> {{ t(`consoleSections.${section}.action`) }}</button></div>
    <div v-if="isLoading" class="data-state-banner">{{ t('common.loading') }}</div><div v-else-if="isFallback" class="data-state-banner warning">{{ t('common.fallbackData') }}</div>

    <section v-if="section === 'models'" class="console-surface"><div class="panel-heading"><div><h2>{{ t('consoleSections.modelAccess') }}</h2><p>{{ t('consoleSections.modelAccessDesc') }}</p></div></div><div class="request-table console-data-table"><table><thead><tr><th>{{ t('dashboard.model') }}</th><th>{{ t('catalog.provider') }}</th><th>{{ t('consoleSections.type') }}</th><th>{{ t('consoleSections.priority') }}</th><th>{{ t('consoleSections.rateLimit') }}</th><th>{{ t('consoleSections.budget') }}</th><th>{{ t('dashboard.status') }}</th><th /></tr></thead><tbody><tr v-if="!filteredModels.length"><td colspan="8" class="empty-row">{{ t('consoleSections.noWorkspaceModels') }}</td></tr><tr v-for="model in filteredModels" :key="model.id"><td><b>{{ model.alias || model.name }}</b><code>{{ model.alias ? model.name + ' · ' : '' }}{{ model.slug }}</code></td><td>{{ model.provider }}</td><td>{{ t(`common.types.${model.type}`) }}</td><td>{{ model.priority }}</td><td>{{ model.rateLimitRpm }} RPM</td><td>{{ model.dailyBudgetCny == null ? t('consoleSections.unlimited') : `¥${model.dailyBudgetCny.toFixed(2)}` }}</td><td><span :class="['success-dot', { muted: !model.enabled }]"><i />{{ model.enabled ? t('consoleSections.enabled') : t('consoleSections.disabled') }}</span></td><td><button class="icon-action" :aria-label="t('consoleSections.configureModel')" @click="openModelModal(model)"><Pencil :size="14" /></button></td></tr></tbody></table></div></section>

    <section v-else-if="section === 'routes'" class="route-rule-grid"><div v-if="!filteredRoutes.length" class="console-surface route-empty">{{ t('consoleSections.noRoutes') }}</div><article v-for="rule in filteredRoutes" :key="rule.id" class="console-surface route-rule"><div><span><RouteIcon :size="18" /></span><button :aria-label="t('consoleSections.editRoute')" @click="openRouteModal(rule)"><Pencil :size="15" /></button></div><h2>{{ rule.name }}</h2><p>{{ t(`consoleSections.routeMatch.${rule.matchType}`) }} · {{ t(`consoleSections.routeStrategy.${rule.strategy}`) }}</p><dl><div><dt>{{ t('consoleSections.primaryModel') }}</dt><dd>{{ rule.primaryModelName }}</dd></div><div><dt>{{ t('consoleSections.fallbackModel') }}</dt><dd>{{ rule.fallbackModelName || t('consoleSections.noFallback') }}</dd></div><div><dt>{{ t('consoleSections.traffic') }}</dt><dd>{{ rule.trafficPercent }}%</dd></div></dl><footer><span :class="['success-dot', { muted: !rule.enabled }]"><i />{{ rule.enabled ? t('consoleSections.enabled') : t('consoleSections.disabled') }}</span><button @click="openRouteModal(rule)">{{ t('common.details') }}</button></footer></article></section>

    <section v-else-if="section === 'keys'" class="console-surface"><div class="security-note"><ShieldCheck :size="18" /><div><b>{{ t('consoleSections.keySafety') }}</b><p>{{ t('consoleSections.keySafetyDesc') }}</p></div></div><div class="request-table console-data-table"><table><thead><tr><th>{{ t('consoleSections.name') }}</th><th>{{ t('dashboard.keys') }}</th><th>{{ t('consoleSections.created') }}</th><th>{{ t('consoleSections.lastUsed') }}</th><th /></tr></thead><tbody><tr v-if="!keyQuery.data.value?.data.length"><td colspan="5" class="empty-row">{{ t('consoleSections.noKeys') }}</td></tr><tr v-for="key in keyQuery.data.value?.data" :key="key.id"><td><b>{{ key.name }}</b></td><td><code>{{ key.maskedKey }}</code></td><td>{{ shortDate(key.createdAt) }}</td><td>{{ shortDate(key.lastUsedAt) }}</td><td><button class="icon-action danger" :aria-label="t('consoleSections.revokeKey')" @click="revokeKey(key.id)"><Trash2 :size="14" /></button></td></tr></tbody></table></div></section>

    <section v-else-if="section === 'logs'" class="console-surface"><div class="panel-heading"><div><h2>{{ t('dashboard.recent') }}</h2><p>{{ t('consoleSections.logs.description') }}</p></div></div><div class="request-table console-data-table"><table><thead><tr><th>{{ t('dashboard.requestId') }}</th><th>{{ t('dashboard.model') }}</th><th>{{ t('dashboard.status') }}</th><th>{{ t('dashboard.latency') }}</th><th>{{ t('dashboard.tokenCount') }}</th><th>{{ t('dashboard.cost') }}</th></tr></thead><tbody><tr v-for="item in filteredLogs" :key="item.id"><td><code>{{ item.requestId }}</code></td><td>{{ item.modelName }}</td><td><span :class="['success-dot', { failed: item.status === 'failed' }]"><i />{{ t(`dashboard.${item.status}`) }}</span></td><td>{{ item.latencyMs }} ms</td><td>{{ item.tokenCount.toLocaleString() }}</td><td>¥{{ item.costCny.toFixed(4) }}</td></tr></tbody></table></div></section>

    <template v-else-if="section === 'billing'"><section class="billing-grid"><article class="console-surface"><span>{{ t('dashboard.balance') }}</span><strong>¥328.42</strong><p>{{ t('consoleSections.billingHint') }}</p></article><article class="console-surface"><span>{{ t('dashboard.spending') }}</span><strong>¥171.58</strong><p>34% / ¥500.00</p></article><article class="console-surface"><span>{{ t('consoleSections.nextInvoice') }}</span><strong>11 / 01</strong><p>{{ t('consoleSections.autoInvoice') }}</p></article></section><section class="console-surface"><h2>{{ t('consoleSections.transactions') }}</h2><div class="request-table console-data-table"><table><thead><tr><th>{{ t('consoleSections.date') }}</th><th>{{ t('consoleSections.item') }}</th><th>{{ t('dashboard.status') }}</th><th>{{ t('consoleSections.amount') }}</th></tr></thead><tbody><tr><td>2026-10-18</td><td>API Usage</td><td><span class="success-dot"><i />{{ t('consoleSections.settled') }}</span></td><td>¥42.18</td></tr><tr><td>2026-10-01</td><td>{{ t('dashboard.recharge') }}</td><td><span class="success-dot"><i />{{ t('consoleSections.completed') }}</span></td><td>+¥500.00</td></tr></tbody></table></div></section></template>

    <section v-else-if="section === 'members'" class="console-surface"><div class="request-table console-data-table"><table><thead><tr><th>{{ t('consoleSections.member') }}</th><th>{{ t('consoleSections.email') }}</th><th>{{ t('consoleSections.role') }}</th><th>{{ t('dashboard.status') }}</th><th /></tr></thead><tbody><tr v-for="member in members" :key="member.email"><td><b>{{ member.name }}</b></td><td>{{ member.email }}</td><td>{{ member.role }}</td><td><span class="success-dot"><i />{{ member.status }}</span></td><td><button class="icon-action"><MoreHorizontal :size="14" /></button></td></tr></tbody></table></div></section>

    <section v-else class="settings-grid"><article class="console-surface settings-card"><div><SlidersHorizontal :size="19" /><div><h2>{{ t('consoleSections.workspaceSettings') }}</h2><p>{{ t('consoleSections.workspaceSettingsDesc') }}</p></div></div><label>{{ t('consoleSections.workspaceName') }}<input value="Nexus Demo" /></label><label>{{ t('consoleSections.defaultCurrency') }}<select><option>CNY · ¥</option><option>USD · $</option></select></label><button class="console-primary-action"><Check :size="14" />{{ t('consoleSections.save') }}</button></article><article class="console-surface settings-card"><div><ShieldCheck :size="19" /><div><h2>{{ t('consoleSections.securitySettings') }}</h2><p>{{ t('consoleSections.securitySettingsDesc') }}</p></div></div><label class="setting-toggle"><span><b>IP Allowlist</b><small>0.0.0.0/0</small></span><input type="checkbox" /></label><label class="setting-toggle"><span><b>{{ t('consoleSections.auditLog') }}</b><small>{{ t('consoleSections.auditLogDesc') }}</small></span><input type="checkbox" checked /></label></article></section>

    <ApiKeyModal :open="keyModalOpen" :busy="keyMutation.isPending.value" :secret="createdKey?.key" :error="keyError" @close="closeKeyModal" @submit="keyMutation.mutate" />
    <ModelConfigModal :open="modelModalOpen" :busy="modelMutation.isPending.value || removeModelMutation.isPending.value" :models="modalModels" :editing="editingModel" :error="modelError" @close="modelModalOpen = false" @submit="modelMutation.mutate" @remove="removeModel" />
    <RouteRuleModal :open="routeModalOpen" :busy="routeMutation.isPending.value || removeRouteMutation.isPending.value" :models="modelQuery.data.value?.data ?? []" :editing="editingRoute" :error="routeError" @close="routeModalOpen = false" @submit="routeMutation.mutate" @remove="removeRoute" />
  </ConsoleShell>
</template>
