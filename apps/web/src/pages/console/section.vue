<script setup lang="ts">
import { CircleDollarSign, Pencil, Plus, Route as RouteIcon, ShieldCheck, Trash2 } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { CreateApiKeyResponse, RouteRule, WorkspaceModelConfig } from './api'
import WorkspaceMembers from './cmp/WorkspaceMembers.vue'
import WorkspaceIpPolicy from './cmp/WorkspaceIpPolicy.vue'
import WorkspaceSettings from './cmp/WorkspaceSettings.vue'
import ConsoleShell from './cmp/ConsoleShell.vue'
import ApiKeyModal from './cmp/ApiKeyModal.vue'
import ModelConfigModal from './cmp/ModelConfigModal.vue'
import RouteRuleModal from './cmp/RouteRuleModal.vue'
import { createApiKey, createConsoleModel, createRouteRule, getApiKeys, getCatalogModels, getConsoleModels, getRequestLogs, getRouteRules, removeConsoleModel, removeRouteRule, revokeApiKey, updateConsoleModel, updateRouteRule } from './api'
import type { CreateRouteRuleInput, CreateWorkspaceModelInput } from './api/types'
import { activeWorkspace, workspaceQueryKey } from '../../lib/workspace'

type ConsoleSection = 'models' | 'routes' | 'keys' | 'logs' | 'billing' | 'members' | 'settings'
const route = useRoute()
const { t } = useI18n()
const queryClient = useQueryClient()
const search = ref('')
const section = computed(() => route.meta.section as ConsoleSection)
const modelQuery = useQuery({ queryKey: computed(() => workspaceQueryKey('console-models')), queryFn: ({ signal }) => getConsoleModels(signal), staleTime: 60_000, enabled: computed(() => section.value === 'models' || section.value === 'routes'), retry: 1 })
const catalogQuery = useQuery({ queryKey: ['catalog-models'], queryFn: ({ signal }) => getCatalogModels(signal), staleTime: 60_000, enabled: computed(() => section.value === 'models'), retry: 1 })
const keyQuery = useQuery({ queryKey: computed(() => workspaceQueryKey('api-keys')), queryFn: ({ signal }) => getApiKeys(signal), staleTime: 30_000, enabled: computed(() => section.value === 'keys'), retry: 1 })
const logQuery = useQuery({ queryKey: computed(() => workspaceQueryKey('console-request-logs')), queryFn: ({ signal }) => getRequestLogs(signal), staleTime: 30_000, enabled: computed(() => section.value === 'logs'), retry: 1 })
const routeQuery = useQuery({ queryKey: computed(() => workspaceQueryKey('console-routes')), queryFn: ({ signal }) => getRouteRules(signal), staleTime: 30_000, enabled: computed(() => section.value === 'routes'), retry: 1 })
const filteredModels = computed(() => {
  const keyword = search.value.toLowerCase()
  return (modelQuery.data.value?.data ?? []).filter((item) => !keyword || `${item.name} ${item.alias ?? ''} ${item.slug} ${item.provider}`.toLowerCase().includes(keyword))
})
const filteredLogs = computed(() => {
  const keyword = search.value.toLowerCase()
  return (logQuery.data.value?.data ?? []).filter((item) => !keyword || `${item.requestId} ${item.modelName} ${item.modelId}`.toLowerCase().includes(keyword))
})
const filteredRoutes = computed(() => {
  const keyword = search.value.toLowerCase()
  return (routeQuery.data.value?.data ?? []).filter((item) => !keyword || `${item.name} ${item.primaryModelName} ${item.fallbackModelName ?? ''}`.toLowerCase().includes(keyword))
})
const title = computed(() => t(`consoleSections.${section.value}.title`))
const description = computed(() => t(`consoleSections.${section.value}.description`))
const isError = computed(() => section.value === 'models' ? modelQuery.isError.value || catalogQuery.isError.value : section.value === 'routes' ? routeQuery.isError.value || modelQuery.isError.value : section.value === 'keys' ? keyQuery.isError.value : section.value === 'logs' ? logQuery.isError.value : false)
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
const availableCatalogModels = computed(() => (catalogQuery.data.value?.data ?? []).filter((model) => !configuredIds.value.has(model.id)))
const modalModels = computed(() => editingModel.value ? (catalogQuery.data.value?.data ?? []).filter((model) => model.id === editingModel.value?.modelId) : availableCatalogModels.value)
const canManageResources = computed(() => ['owner', 'admin', 'developer'].includes(activeWorkspace.value?.role ?? ''))

const keyMutation = useMutation({
  mutationFn: (name: string) => createApiKey({ name }),
  onSuccess: async (key) => { createdKey.value = key; await queryClient.invalidateQueries({ queryKey: workspaceQueryKey('api-keys') }) },
  onError: (error) => { keyError.value = error instanceof Error ? error.message : t('consoleSections.saveFailed') },
})
const modelMutation = useMutation({
  mutationFn: (value: CreateWorkspaceModelInput) => editingModel.value ? updateConsoleModel(editingModel.value.id, value) : createConsoleModel(value),
  onSuccess: async () => { modelModalOpen.value = false; editingModel.value = null; await queryClient.invalidateQueries({ queryKey: workspaceQueryKey('console-models') }) },
  onError: (error) => { modelError.value = error instanceof Error ? error.message : t('consoleSections.saveFailed') },
})
const removeModelMutation = useMutation({ mutationFn: (id: string) => removeConsoleModel(id), onSuccess: async () => { modelModalOpen.value = false; editingModel.value = null; await queryClient.invalidateQueries({ queryKey: workspaceQueryKey('console-models') }) } })
const routeMutation = useMutation({
  mutationFn: (value: CreateRouteRuleInput) => editingRoute.value ? updateRouteRule(editingRoute.value.id, value) : createRouteRule(value),
  onSuccess: async () => { routeModalOpen.value = false; editingRoute.value = null; await queryClient.invalidateQueries({ queryKey: workspaceQueryKey('console-routes') }) },
  onError: (error) => { routeError.value = error instanceof Error ? error.message : t('consoleSections.saveFailed') },
})
const removeRouteMutation = useMutation({ mutationFn: (id: string) => removeRouteRule(id), onSuccess: async () => { routeModalOpen.value = false; editingRoute.value = null; await queryClient.invalidateQueries({ queryKey: workspaceQueryKey('console-routes') }) } })

function openKeyModal() { createdKey.value = null; keyError.value = ''; keyModalOpen.value = true }
function closeKeyModal() { keyModalOpen.value = false; createdKey.value = null }
function openModelModal(model?: WorkspaceModelConfig) { editingModel.value = model ?? null; modelError.value = ''; modelModalOpen.value = true }
function openRouteModal(rule?: RouteRule) { editingRoute.value = rule ?? null; routeError.value = ''; routeModalOpen.value = true }
function handleSectionAction() { if (section.value === 'keys') openKeyModal(); else if (section.value === 'models') openModelModal(); else if (section.value === 'routes') openRouteModal() }
function revokeKey(id: string) { if (window.confirm(t('consoleSections.revokeKeyConfirm'))) revokeApiKey(id).then(() => queryClient.invalidateQueries({ queryKey: workspaceQueryKey('api-keys') })) }
function removeModel() { if (editingModel.value && window.confirm(t('consoleSections.removeModelConfirm'))) removeModelMutation.mutate(editingModel.value.id) }
function removeRoute() { if (editingRoute.value && window.confirm(t('consoleSections.removeRouteConfirm'))) removeRouteMutation.mutate(editingRoute.value.id) }
const shortDate = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value)) : '—'
function refetchSection() {
  if (section.value === 'models') { modelQuery.refetch(); catalogQuery.refetch() }
  else if (section.value === 'routes') { routeQuery.refetch(); modelQuery.refetch() }
  else if (section.value === 'keys') keyQuery.refetch()
  else if (section.value === 'logs') logQuery.refetch()
}
</script>

<template>
  <ConsoleShell v-model:search="search">
    <div class="console-title console-section-title"><div><p>NEXUS CONSOLE</p><h1>{{ title }}</h1><span>{{ description }}</span></div><button v-if="canManageResources && (section === 'models' || section === 'routes' || section === 'keys')" class="console-primary-action" @click="handleSectionAction"><Plus :size="15" /> {{ t(`consoleSections.${section}.action`) }}</button></div>
    <div v-if="isLoading" class="console-state" role="status">{{ t('common.loading') }}</div><div v-else-if="isError" class="console-state error" role="alert"><div><b>数据加载失败</b><span>页面未使用演示数据，请检查服务后重试。</span></div><button class="console-secondary-action" @click="refetchSection">重试</button></div>

    <section v-if="section === 'models' && !isError" class="console-surface"><div class="panel-heading"><div><h2>{{ t('consoleSections.modelAccess') }}</h2><p>{{ t('consoleSections.modelAccessDesc') }}</p></div></div><div class="request-table console-data-table responsive-table"><table><thead><tr><th>{{ t('dashboard.model') }}</th><th>{{ t('catalog.provider') }}</th><th>{{ t('consoleSections.type') }}</th><th>{{ t('consoleSections.priority') }}</th><th>{{ t('consoleSections.rateLimit') }}</th><th>{{ t('consoleSections.budget') }}</th><th>{{ t('dashboard.status') }}</th><th /></tr></thead><tbody><tr v-if="!filteredModels.length"><td colspan="8" class="empty-row">{{ t('consoleSections.noWorkspaceModels') }}</td></tr><tr v-for="model in filteredModels" :key="model.id"><td :data-label="t('dashboard.model')"><b>{{ model.alias || model.name }}</b><code>{{ model.alias ? model.name + ' · ' : '' }}{{ model.slug }}</code></td><td :data-label="t('catalog.provider')">{{ model.provider }}</td><td :data-label="t('consoleSections.type')">{{ t(`common.types.${model.type}`) }}</td><td :data-label="t('consoleSections.priority')">{{ model.priority }}</td><td :data-label="t('consoleSections.rateLimit')">{{ model.rateLimitRpm }} RPM</td><td :data-label="t('consoleSections.budget')">{{ model.dailyBudgetCny == null ? t('consoleSections.unlimited') : `¥${model.dailyBudgetCny.toFixed(2)}` }}</td><td :data-label="t('dashboard.status')"><span :class="['success-dot', { muted: !model.enabled }]"><i />{{ model.enabled ? t('consoleSections.enabled') : t('consoleSections.disabled') }}</span></td><td data-label="操作"><button v-if="canManageResources" class="icon-action" :aria-label="t('consoleSections.configureModel')" @click="openModelModal(model)"><Pencil :size="14" /></button></td></tr></tbody></table></div></section>

    <section v-else-if="section === 'routes' && !isError" class="route-rule-grid"><div v-if="!filteredRoutes.length" class="console-surface route-empty">{{ t('consoleSections.noRoutes') }}</div><article v-for="rule in filteredRoutes" :key="rule.id" class="console-surface route-rule"><div><span><RouteIcon :size="18" /></span><button v-if="canManageResources" :aria-label="t('consoleSections.editRoute')" @click="openRouteModal(rule)"><Pencil :size="15" /></button></div><h2>{{ rule.name }}</h2><p>{{ t(`consoleSections.routeMatch.${rule.matchType}`) }} · {{ t(`consoleSections.routeStrategy.${rule.strategy}`) }}</p><dl><div><dt>{{ t('consoleSections.primaryModel') }}</dt><dd>{{ rule.primaryModelName }}</dd></div><div><dt>{{ t('consoleSections.fallbackModel') }}</dt><dd>{{ rule.fallbackModelName || t('consoleSections.noFallback') }}</dd></div><div><dt>{{ t('consoleSections.traffic') }}</dt><dd>{{ rule.trafficPercent }}%</dd></div></dl><footer><span :class="['success-dot', { muted: !rule.enabled }]"><i />{{ rule.enabled ? t('consoleSections.enabled') : t('consoleSections.disabled') }}</span><button v-if="canManageResources" @click="openRouteModal(rule)">{{ t('common.details') }}</button></footer></article></section>

    <section v-else-if="section === 'keys' && !isError" class="console-surface"><div class="security-note"><ShieldCheck :size="18" /><div><b>{{ t('consoleSections.keySafety') }}</b><p>{{ t('consoleSections.keySafetyDesc') }}</p></div></div><div class="request-table console-data-table responsive-table"><table><thead><tr><th>{{ t('consoleSections.name') }}</th><th>{{ t('dashboard.keys') }}</th><th>{{ t('consoleSections.created') }}</th><th>{{ t('consoleSections.lastUsed') }}</th><th /></tr></thead><tbody><tr v-if="!keyQuery.data.value?.data.length"><td colspan="5" class="empty-row">{{ t('consoleSections.noKeys') }}</td></tr><tr v-for="key in keyQuery.data.value?.data" :key="key.id"><td :data-label="t('consoleSections.name')"><b>{{ key.name }}</b></td><td :data-label="t('dashboard.keys')"><code>{{ key.maskedKey }}</code></td><td :data-label="t('consoleSections.created')">{{ shortDate(key.createdAt) }}</td><td :data-label="t('consoleSections.lastUsed')">{{ shortDate(key.lastUsedAt) }}</td><td data-label="操作"><button v-if="canManageResources" class="icon-action danger" :aria-label="t('consoleSections.revokeKey')" @click="revokeKey(key.id)"><Trash2 :size="14" /></button></td></tr></tbody></table></div></section>

    <section v-else-if="section === 'logs' && !isError" class="console-surface"><div class="panel-heading"><div><h2>{{ t('dashboard.recent') }}</h2><p>{{ t('consoleSections.logs.description') }}</p></div></div><div class="request-table console-data-table responsive-table"><table><thead><tr><th>{{ t('dashboard.requestId') }}</th><th>{{ t('dashboard.model') }}</th><th>{{ t('dashboard.status') }}</th><th>{{ t('dashboard.latency') }}</th><th>{{ t('dashboard.tokenCount') }}</th><th>{{ t('dashboard.cost') }}</th></tr></thead><tbody><tr v-if="!filteredLogs.length" class="table-empty"><td colspan="6">暂无调用记录</td></tr><tr v-for="item in filteredLogs" :key="item.id"><td :data-label="t('dashboard.requestId')"><code>{{ item.requestId }}</code></td><td :data-label="t('dashboard.model')">{{ item.modelName }}</td><td :data-label="t('dashboard.status')"><span :class="['success-dot', { failed: item.status === 'failed' }]"><i />{{ t(`dashboard.${item.status}`) }}</span></td><td :data-label="t('dashboard.latency')">{{ item.latencyMs }} ms</td><td :data-label="t('dashboard.tokenCount')">{{ item.tokenCount.toLocaleString() }}</td><td :data-label="t('dashboard.cost')">¥{{ item.costCny.toFixed(4) }}</td></tr></tbody></table></div></section>

    <template v-else-if="section === 'billing'">
      <section class="console-surface billing-unavailable">
        <CircleDollarSign :size="28" />
        <div><h2>计费功能尚未启用</h2><p>账本、余额、交易和发票接口完成前，这里不会展示模拟金额。当前调用成本仍可在调用日志中查看。</p></div>
      </section>
    </template>

    <WorkspaceMembers v-else-if="section === 'members'" />

    <section v-else-if="section === 'settings'" class="settings-grid"><WorkspaceSettings /><WorkspaceIpPolicy /></section>

    <ApiKeyModal :open="keyModalOpen" :busy="keyMutation.isPending.value" :secret="createdKey?.key" :error="keyError" @close="closeKeyModal" @submit="keyMutation.mutate" />
    <ModelConfigModal :open="modelModalOpen" :busy="modelMutation.isPending.value || removeModelMutation.isPending.value" :models="modalModels" :editing="editingModel" :error="modelError" @close="modelModalOpen = false" @submit="modelMutation.mutate" @remove="removeModel" />
    <RouteRuleModal :open="routeModalOpen" :busy="routeMutation.isPending.value || removeRouteMutation.isPending.value" :models="modelQuery.data.value?.data ?? []" :editing="editingRoute" :error="routeError" @close="routeModalOpen = false" @submit="routeMutation.mutate" @remove="removeRoute" />
  </ConsoleShell>
</template>
