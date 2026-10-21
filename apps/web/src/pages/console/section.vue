<script setup lang="ts">
import { Check, Copy, MoreHorizontal, Plus, Route as RouteIcon, ShieldCheck, SlidersHorizontal, Trash2 } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import type { RequestLogListResponse } from './api'
import ConsoleShell from './cmp/ConsoleShell.vue'
import { models as fallbackModels } from '../../data/models'
import { getConsoleModels, getRequestLogs } from './api'

type ConsoleSection = 'models' | 'routes' | 'keys' | 'logs' | 'billing' | 'members' | 'settings'
const route = useRoute()
const { t } = useI18n()
const search = ref('')
const section = computed(() => route.meta.section as ConsoleSection)
const modelQuery = useQuery({ queryKey: ['console-models'], queryFn: ({ signal }) => getConsoleModels(signal), staleTime: 60_000, enabled: computed(() => section.value === 'models'), retry: 1 })
const logQuery = useQuery({ queryKey: ['console-request-logs'], queryFn: ({ signal }) => getRequestLogs(signal), staleTime: 30_000, enabled: computed(() => section.value === 'logs'), retry: 1 })

const fallbackLogs: RequestLogListResponse['data'] = [
  { id: '1', requestId: 'req_9ab2f3', modelId: 'openai/gpt-6.1-sol', modelName: 'GPT-6.1 Sol', status: 'success', latencyMs: 384, tokenCount: 1842, costCny: .0284, createdAt: new Date().toISOString() },
  { id: '2', requestId: 'req_8fc12a', modelId: 'deepseek/deepseek-v4.1-flash', modelName: 'DeepSeek V4.1 Flash', status: 'success', latencyMs: 218, tokenCount: 920, costCny: .0038, createdAt: new Date().toISOString() },
  { id: '3', requestId: 'req_failed12', modelId: 'anthropic/claude-sonnet-5.5', modelName: 'Claude Sonnet 5.5', status: 'failed', latencyMs: 10000, tokenCount: 0, costCny: 0, createdAt: new Date().toISOString() },
]
const filteredModels = computed(() => {
  const keyword = search.value.toLowerCase()
  return (modelQuery.data.value?.data ?? fallbackModels).filter((item) => !keyword || `${item.name} ${item.slug} ${item.provider}`.toLowerCase().includes(keyword))
})
const filteredLogs = computed(() => {
  const keyword = search.value.toLowerCase()
  return (logQuery.data.value?.data ?? fallbackLogs).filter((item) => !keyword || `${item.requestId} ${item.modelName} ${item.modelId}`.toLowerCase().includes(keyword))
})
const routingRules = [
  { name: 'Auto Router', condition: t('consoleSections.routeDefault'), primary: 'GPT-6.1 Sol', fallback: 'Claude Sonnet 5.5', traffic: '82%' },
  { name: 'Low Cost', condition: t('consoleSections.routeBudget'), primary: 'Gemini 3 Flash', fallback: 'DeepSeek V4.1 Flash', traffic: '12%' },
  { name: 'Creative Media', condition: t('consoleSections.routeMedia'), primary: 'Seedance 2.5', fallback: 'Seedream 5', traffic: '6%' },
]
const apiKeys = ref([
  { id: 'key_live_01', name: 'Production', preview: 'nxs_live_••••••••4F2A', created: '2026-10-08', lastUsed: t('consoleSections.minutesAgo', { count: 3 }) },
  { id: 'key_test_01', name: 'Development', preview: 'nxs_test_••••••••9C1D', created: '2026-09-21', lastUsed: t('consoleSections.hoursAgo', { count: 2 }) },
])
const members = [
  { name: '林宇', email: 'linyu@nexus.cn', role: t('consoleSections.owner'), status: t('common.stable') },
  { name: '陈晓', email: 'chenxiao@nexus.cn', role: t('consoleSections.developer'), status: t('common.stable') },
  { name: '王宁', email: 'wangning@nexus.cn', role: t('consoleSections.finance'), status: t('consoleSections.invited') },
]
const title = computed(() => t(`consoleSections.${section.value}.title`))
const description = computed(() => t(`consoleSections.${section.value}.description`))
const isFallback = computed(() => section.value === 'models' ? modelQuery.isError.value : section.value === 'logs' ? logQuery.isError.value : false)
const isLoading = computed(() => section.value === 'models' ? modelQuery.isLoading.value : section.value === 'logs' ? logQuery.isLoading.value : false)
const addKey = () => apiKeys.value.unshift({ id: `key_test_${Date.now()}`, name: t('consoleSections.newKey'), preview: 'nxs_test_••••••••NEW1', created: new Date().toISOString().slice(0, 10), lastUsed: '—' })
</script>

<template>
  <ConsoleShell v-model:search="search">
    <div class="console-title console-section-title"><div><p>NEXUS CONSOLE</p><h1>{{ title }}</h1><span>{{ description }}</span></div><button v-if="section !== 'settings'" class="console-primary-action" @click="section === 'keys' ? addKey() : undefined"><Plus :size="15" /> {{ t(`consoleSections.${section}.action`) }}</button></div>
    <div v-if="isLoading" class="data-state-banner">{{ t('common.loading') }}</div><div v-else-if="isFallback" class="data-state-banner warning">{{ t('common.fallbackData') }}</div>

    <section v-if="section === 'models'" class="console-surface"><div class="panel-heading"><div><h2>{{ t('consoleSections.modelAccess') }}</h2><p>{{ t('consoleSections.modelAccessDesc') }}</p></div></div><div class="request-table console-data-table"><table><thead><tr><th>{{ t('dashboard.model') }}</th><th>{{ t('catalog.provider') }}</th><th>{{ t('consoleSections.type') }}</th><th>{{ t('ranking.score') }}</th><th>{{ t('consoleSections.price') }}</th><th>{{ t('dashboard.status') }}</th></tr></thead><tbody><tr v-for="model in filteredModels" :key="model.slug"><td><b>{{ model.name }}</b><code>{{ model.slug }}</code></td><td>{{ model.provider }}</td><td>{{ t(`common.types.${model.type}`) }}</td><td>{{ model.score }}</td><td>¥{{ model.inputPrice.toFixed(2) }}</td><td><span class="success-dot"><i />{{ t('common.stable') }}</span></td></tr></tbody></table></div></section>

    <section v-else-if="section === 'routes'" class="route-rule-grid"><article v-for="rule in routingRules" :key="rule.name" class="console-surface route-rule"><div><span><RouteIcon :size="18" /></span><button><MoreHorizontal :size="17" /></button></div><h2>{{ rule.name }}</h2><p>{{ rule.condition }}</p><dl><div><dt>{{ t('consoleSections.primaryModel') }}</dt><dd>{{ rule.primary }}</dd></div><div><dt>{{ t('consoleSections.fallbackModel') }}</dt><dd>{{ rule.fallback }}</dd></div><div><dt>{{ t('consoleSections.traffic') }}</dt><dd>{{ rule.traffic }}</dd></div></dl><footer><span class="success-dot"><i />{{ t('consoleSections.enabled') }}</span><button>{{ t('common.details') }}</button></footer></article></section>

    <section v-else-if="section === 'keys'" class="console-surface"><div class="security-note"><ShieldCheck :size="18" /><div><b>{{ t('consoleSections.keySafety') }}</b><p>{{ t('consoleSections.keySafetyDesc') }}</p></div></div><div class="request-table console-data-table"><table><thead><tr><th>{{ t('consoleSections.name') }}</th><th>{{ t('dashboard.keys') }}</th><th>{{ t('consoleSections.created') }}</th><th>{{ t('consoleSections.lastUsed') }}</th><th /></tr></thead><tbody><tr v-for="key in apiKeys" :key="key.id"><td><b>{{ key.name }}</b></td><td><code>{{ key.preview }}</code></td><td>{{ key.created }}</td><td>{{ key.lastUsed }}</td><td><button class="icon-action"><Copy :size="14" /></button><button class="icon-action danger" @click="apiKeys = apiKeys.filter(item => item.id !== key.id)"><Trash2 :size="14" /></button></td></tr></tbody></table></div></section>

    <section v-else-if="section === 'logs'" class="console-surface"><div class="panel-heading"><div><h2>{{ t('dashboard.recent') }}</h2><p>{{ t('consoleSections.logs.description') }}</p></div></div><div class="request-table console-data-table"><table><thead><tr><th>{{ t('dashboard.requestId') }}</th><th>{{ t('dashboard.model') }}</th><th>{{ t('dashboard.status') }}</th><th>{{ t('dashboard.latency') }}</th><th>{{ t('dashboard.tokenCount') }}</th><th>{{ t('dashboard.cost') }}</th></tr></thead><tbody><tr v-for="item in filteredLogs" :key="item.id"><td><code>{{ item.requestId }}</code></td><td>{{ item.modelName }}</td><td><span :class="['success-dot', { failed: item.status === 'failed' }]"><i />{{ t(`dashboard.${item.status}`) }}</span></td><td>{{ item.latencyMs }} ms</td><td>{{ item.tokenCount.toLocaleString() }}</td><td>¥{{ item.costCny.toFixed(4) }}</td></tr></tbody></table></div></section>

    <template v-else-if="section === 'billing'"><section class="billing-grid"><article class="console-surface"><span>{{ t('dashboard.balance') }}</span><strong>¥328.42</strong><p>{{ t('consoleSections.billingHint') }}</p></article><article class="console-surface"><span>{{ t('dashboard.spending') }}</span><strong>¥171.58</strong><p>34% / ¥500.00</p></article><article class="console-surface"><span>{{ t('consoleSections.nextInvoice') }}</span><strong>11 / 01</strong><p>{{ t('consoleSections.autoInvoice') }}</p></article></section><section class="console-surface"><h2>{{ t('consoleSections.transactions') }}</h2><div class="request-table console-data-table"><table><thead><tr><th>{{ t('consoleSections.date') }}</th><th>{{ t('consoleSections.item') }}</th><th>{{ t('dashboard.status') }}</th><th>{{ t('consoleSections.amount') }}</th></tr></thead><tbody><tr><td>2026-10-18</td><td>API Usage</td><td><span class="success-dot"><i />{{ t('consoleSections.settled') }}</span></td><td>¥42.18</td></tr><tr><td>2026-10-01</td><td>{{ t('dashboard.recharge') }}</td><td><span class="success-dot"><i />{{ t('consoleSections.completed') }}</span></td><td>+¥500.00</td></tr></tbody></table></div></section></template>

    <section v-else-if="section === 'members'" class="console-surface"><div class="request-table console-data-table"><table><thead><tr><th>{{ t('consoleSections.member') }}</th><th>{{ t('consoleSections.email') }}</th><th>{{ t('consoleSections.role') }}</th><th>{{ t('dashboard.status') }}</th><th /></tr></thead><tbody><tr v-for="member in members" :key="member.email"><td><b>{{ member.name }}</b></td><td>{{ member.email }}</td><td>{{ member.role }}</td><td><span class="success-dot"><i />{{ member.status }}</span></td><td><button class="icon-action"><MoreHorizontal :size="14" /></button></td></tr></tbody></table></div></section>

    <section v-else class="settings-grid"><article class="console-surface settings-card"><div><SlidersHorizontal :size="19" /><div><h2>{{ t('consoleSections.workspaceSettings') }}</h2><p>{{ t('consoleSections.workspaceSettingsDesc') }}</p></div></div><label>{{ t('consoleSections.workspaceName') }}<input value="Nexus Demo" /></label><label>{{ t('consoleSections.defaultCurrency') }}<select><option>CNY · ¥</option><option>USD · $</option></select></label><button class="console-primary-action"><Check :size="14" />{{ t('consoleSections.save') }}</button></article><article class="console-surface settings-card"><div><ShieldCheck :size="19" /><div><h2>{{ t('consoleSections.securitySettings') }}</h2><p>{{ t('consoleSections.securitySettingsDesc') }}</p></div></div><label class="setting-toggle"><span><b>IP Allowlist</b><small>0.0.0.0/0</small></span><input type="checkbox" /></label><label class="setting-toggle"><span><b>{{ t('consoleSections.auditLog') }}</b><small>{{ t('consoleSections.auditLogDesc') }}</small></span><input type="checkbox" checked /></label></article></section>
  </ConsoleShell>
</template>
