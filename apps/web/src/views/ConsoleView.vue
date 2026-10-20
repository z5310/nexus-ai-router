<script setup lang="ts">
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, CircleDollarSign, Plus, Zap } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import type { DashboardOverviewResponse } from '@gateway/contracts'
import ConsoleShell from '../components/ConsoleShell.vue'
import { getJson } from '../lib/api-client'

const { t } = useI18n()
const search = ref('')
const fallbackOverview: DashboardOverviewResponse = {
  stats: {
    requests: { value: 128430, changePercent: 18.4, direction: 'up' },
    tokens: { value: 24800000, changePercent: 12.1, direction: 'up' },
    latency: { value: 384, changePercent: -8.2, direction: 'down' },
    spending: { value: 286.42, changePercent: 6.7, direction: 'up' },
  },
  balance: { availableCny: 328.42, usedThisMonthCny: 171.58, usagePercent: 34 },
  trend: Array.from({ length: 24 }, (_, index) => ({ timestamp: new Date(Date.now() - (23 - index) * 3600000).toISOString(), requestCount: 3200 + index * 137, tokenCount: 620000 + index * 28000, averageLatencyMs: 330 + (index % 5) * 18, costCny: 7.4 + index * .34 })),
  recentRequests: [
    { id: '1', requestId: 'req_9ab2f3', modelId: 'openai/gpt-6.1-sol', modelName: 'GPT-6.1 Sol', status: 'success', latencyMs: 384, tokenCount: 1842, costCny: .0284, createdAt: new Date().toISOString() },
    { id: '2', requestId: 'req_8fc12a', modelId: 'deepseek/deepseek-v4.1-flash', modelName: 'DeepSeek V4.1 Flash', status: 'success', latencyMs: 218, tokenCount: 920, costCny: .0038, createdAt: new Date().toISOString() },
    { id: '3', requestId: 'req_7de994', modelId: 'anthropic/claude-sonnet-5.5', modelName: 'Claude Sonnet 5.5', status: 'success', latencyMs: 426, tokenCount: 3104, costCny: .0842, createdAt: new Date().toISOString() },
    { id: '4', requestId: 'req_6ca821', modelId: 'alibaba/qwen-3.8-max', modelName: 'Qwen 3.8 Max', status: 'success', latencyMs: 337, tokenCount: 1280, costCny: .0126, createdAt: new Date().toISOString() },
  ],
}
const overviewQuery = useQuery({ queryKey: ['dashboard-overview'], queryFn: ({ signal }) => getJson<DashboardOverviewResponse>('/api/dashboard/overview', signal), staleTime: 30_000, refetchInterval: 60_000, retry: 1 })
const overview = computed(() => overviewQuery.data.value ?? fallbackOverview)
const requests = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return overview.value.recentRequests.filter((item) => !keyword || `${item.requestId} ${item.modelName} ${item.modelId}`.toLowerCase().includes(keyword))
})
const compactNumber = (value: number) => Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
const chartPath = computed(() => {
  const points = overview.value.trend
  if (!points.length) return 'M0,215 L1000,215'
  const max = Math.max(...points.map((point) => point.requestCount), 1)
  return points.map((point, index) => `${index ? 'L' : 'M'}${(index / Math.max(points.length - 1, 1)) * 1000},${215 - (point.requestCount / max) * 185}`).join(' ')
})
const chartAreaPath = computed(() => `${chartPath.value} L1000,230 L0,230 Z`)
</script>

<template>
  <ConsoleShell v-model:search="search">
    <div class="console-title"><div><p>{{ t('dashboard.greeting') }}</p><h1>{{ t('dashboard.title') }}</h1></div><RouterLink class="console-primary-action" to="/console/keys"><Plus :size="15" /> {{ t('dashboard.createKey') }}</RouterLink></div>
    <div v-if="overviewQuery.isLoading.value" class="data-state-banner">{{ t('common.loading') }}</div>
    <div v-else-if="overviewQuery.isError.value" class="data-state-banner warning">{{ t('common.fallbackData') }}</div>
    <div v-else class="data-state-banner live">{{ t('common.liveData') }}</div>
    <section class="stat-grid">
      <article><div><span>{{ t('dashboard.requests') }}</span><Activity :size="18" /></div><strong>{{ overview.stats.requests.value.toLocaleString() }}</strong><p class="positive"><ArrowUpRight :size="13" /> {{ Math.abs(overview.stats.requests.changePercent) }}% <small>{{ t('dashboard.vsYesterday') }}</small></p></article>
      <article><div><span>{{ t('dashboard.tokens') }}</span><Zap :size="18" /></div><strong>{{ compactNumber(overview.stats.tokens.value) }}</strong><p class="positive"><ArrowUpRight :size="13" /> {{ Math.abs(overview.stats.tokens.changePercent) }}% <small>{{ t('dashboard.vsYesterday') }}</small></p></article>
      <article><div><span>{{ t('dashboard.latency') }}</span><BarChart3 :size="18" /></div><strong>{{ overview.stats.latency.value }} ms</strong><p class="positive"><ArrowDownRight :size="13" /> {{ Math.abs(overview.stats.latency.changePercent) }}% <small>{{ t('dashboard.improved') }}</small></p></article>
      <article><div><span>{{ t('dashboard.spending') }}</span><CircleDollarSign :size="18" /></div><strong>¥ {{ overview.stats.spending.value.toFixed(2) }}</strong><p><ArrowUpRight :size="13" /> {{ Math.abs(overview.stats.spending.changePercent) }}% <small>{{ t('dashboard.vsYesterday') }}</small></p></article>
    </section>
    <section class="usage-panel">
      <div class="panel-heading"><div><h2>{{ t('dashboard.requestTrend') }}</h2><p>{{ t('dashboard.requestTrendDesc') }}</p></div><select><option>{{ t('dashboard.last24h') }}</option><option>{{ t('dashboard.last7d') }}</option></select></div>
      <div class="usage-chart"><div class="axis"><span>12K</span><span>8K</span><span>4K</span><span>0</span></div><svg viewBox="0 0 1000 230" preserveAspectRatio="none" :aria-label="t('dashboard.chartLabel')"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55df8b" stop-opacity=".25"/><stop offset="1" stop-color="#55df8b" stop-opacity="0"/></linearGradient></defs><path class="grid-line" d="M0 20H1000M0 85H1000M0 150H1000M0 215H1000"/><path class="area" :d="chartAreaPath"/><path class="line" :d="chartPath"/></svg><div class="chart-labels"><span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>{{ t('dashboard.now') }}</span></div></div>
    </section>
    <section class="request-panel"><div class="panel-heading"><div><h2>{{ t('dashboard.recent') }}</h2><p>{{ t('dashboard.realtime') }}</p></div><RouterLink to="/console/logs">{{ t('dashboard.viewAll') }} <ArrowUpRight :size="13" /></RouterLink></div><div class="request-table"><table><thead><tr><th>{{ t('dashboard.requestId') }}</th><th>{{ t('dashboard.model') }}</th><th>{{ t('dashboard.status') }}</th><th>{{ t('dashboard.latency') }}</th><th>{{ t('dashboard.tokenCount') }}</th><th>{{ t('dashboard.cost') }}</th></tr></thead><tbody><tr v-for="row in requests" :key="row.id"><td><code>{{ row.requestId }}</code></td><td>{{ row.modelName }}</td><td><span :class="['success-dot', { failed: row.status === 'failed' }]"><i />{{ row.status === 'success' ? t('dashboard.success') : t('dashboard.failed') }}</span></td><td>{{ row.latencyMs }} ms</td><td>{{ row.tokenCount.toLocaleString() }}</td><td>¥{{ row.costCny.toFixed(4) }}</td></tr></tbody></table></div></section>
  </ConsoleShell>
</template>
