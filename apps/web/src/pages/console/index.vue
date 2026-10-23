<script setup lang="ts">
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, CircleDollarSign, RefreshCw, Zap } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import ConsoleShell from './cmp/ConsoleShell.vue'
import { getDashboardOverview } from './api'
import { workspaceQueryKey } from '../../lib/workspace'
import { authState } from '../../lib/auth'

const { t } = useI18n()
const search = ref('')
const overviewQuery = useQuery({
  queryKey: computed(() => workspaceQueryKey('dashboard-overview')),
  queryFn: ({ signal }) => getDashboardOverview(signal),
  staleTime: 30_000,
  refetchInterval: 60_000,
  retry: 1,
})
const overview = computed(() => overviewQuery.data.value ?? null)
const requests = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return (overview.value?.recentRequests ?? []).filter((item) => !keyword || `${item.requestId} ${item.modelName} ${item.modelId}`.toLowerCase().includes(keyword))
})
const compactNumber = (value: number) => Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
const chartMax = computed(() => Math.max(...(overview.value?.trend ?? []).map((point) => point.requestCount), 0))
const chartAxis = computed(() => [1, .67, .33, 0].map((ratio) => compactNumber(Math.round(chartMax.value * ratio))))
const chartPath = computed(() => {
  const points = overview.value?.trend ?? []
  if (!points.length || chartMax.value === 0) return ''
  return points.map((point, index) => `${index ? 'L' : 'M'}${(index / Math.max(points.length - 1, 1)) * 1000},${215 - (point.requestCount / chartMax.value) * 185}`).join(' ')
})
const chartAreaPath = computed(() => chartPath.value ? `${chartPath.value} L1000,230 L0,230 Z` : '')
const chartLabels = computed(() => {
  const points = overview.value?.trend ?? []
  if (!points.length) return []
  const count = Math.min(7, points.length)
  return Array.from({ length: count }, (_, index) => {
    const point = points[Math.round((index / Math.max(count - 1, 1)) * (points.length - 1))]
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(point.timestamp))
  })
})
const hasChange = (value: number, change: number) => value > 0 && change !== 0
</script>

<template>
  <ConsoleShell v-model:search="search">
    <div class="console-title"><div><p>{{ t('dashboard.greeting', { name: authState.user?.name ?? '' }) }}</p><h1>{{ t('dashboard.title') }}</h1></div></div>
    <div v-if="overviewQuery.isLoading.value" class="console-state" role="status">{{ t('common.loading') }}</div>
    <div v-else-if="overviewQuery.isError.value" class="console-state error" role="alert">
      <div><b>概览加载失败</b><span>没有使用演示数据覆盖错误，请检查服务后重试。</span></div>
      <button class="console-secondary-action" @click="overviewQuery.refetch()"><RefreshCw :size="15" />重试</button>
    </div>
    <template v-else-if="overview">
      <section class="stat-grid">
        <article><div><span>{{ t('dashboard.requests') }}</span><Activity :size="18" /></div><strong>{{ overview.stats.requests.value.toLocaleString() }}</strong><p v-if="hasChange(overview.stats.requests.value, overview.stats.requests.changePercent)" class="positive"><component :is="overview.stats.requests.direction === 'up' ? ArrowUpRight : ArrowDownRight" :size="13" /> {{ Math.abs(overview.stats.requests.changePercent) }}% <small>{{ t('dashboard.vsYesterday') }}</small></p><p v-else class="muted-metric">暂无对比数据</p></article>
        <article><div><span>{{ t('dashboard.tokens') }}</span><Zap :size="18" /></div><strong>{{ compactNumber(overview.stats.tokens.value) }}</strong><p v-if="hasChange(overview.stats.tokens.value, overview.stats.tokens.changePercent)" class="positive"><component :is="overview.stats.tokens.direction === 'up' ? ArrowUpRight : ArrowDownRight" :size="13" /> {{ Math.abs(overview.stats.tokens.changePercent) }}% <small>{{ t('dashboard.vsYesterday') }}</small></p><p v-else class="muted-metric">暂无对比数据</p></article>
        <article><div><span>{{ t('dashboard.latency') }}</span><BarChart3 :size="18" /></div><strong>{{ overview.stats.latency.value }} ms</strong><p v-if="hasChange(overview.stats.latency.value, overview.stats.latency.changePercent)" class="positive"><component :is="overview.stats.latency.direction === 'down' ? ArrowDownRight : ArrowUpRight" :size="13" /> {{ Math.abs(overview.stats.latency.changePercent) }}% <small>{{ t('dashboard.improved') }}</small></p><p v-else class="muted-metric">暂无对比数据</p></article>
        <article><div><span>{{ t('dashboard.spending') }}</span><CircleDollarSign :size="18" /></div><strong>¥ {{ overview.stats.spending.value.toFixed(2) }}</strong><p v-if="hasChange(overview.stats.spending.value, overview.stats.spending.changePercent)"><component :is="overview.stats.spending.direction === 'up' ? ArrowUpRight : ArrowDownRight" :size="13" /> {{ Math.abs(overview.stats.spending.changePercent) }}% <small>{{ t('dashboard.vsYesterday') }}</small></p><p v-else class="muted-metric">暂无对比数据</p></article>
      </section>
      <section class="usage-panel">
        <div class="panel-heading"><div><h2>{{ t('dashboard.requestTrend') }}</h2><p>{{ t('dashboard.requestTrendDesc') }}</p></div><span class="panel-period">{{ t('dashboard.last24h') }}</span></div>
        <div v-if="!chartPath" class="chart-empty">过去 24 小时暂无调用趋势</div>
        <div v-else class="usage-chart"><div class="axis"><span v-for="label in chartAxis" :key="label">{{ label }}</span></div><svg viewBox="0 0 1000 230" preserveAspectRatio="none" :aria-label="t('dashboard.chartLabel')"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55df8b" stop-opacity=".25"/><stop offset="1" stop-color="#55df8b" stop-opacity="0"/></linearGradient></defs><path class="grid-line" d="M0 20H1000M0 85H1000M0 150H1000M0 215H1000"/><path class="area" :d="chartAreaPath"/><path class="line" :d="chartPath"/></svg><div class="chart-labels"><span v-for="label in chartLabels" :key="label">{{ label }}</span></div></div>
      </section>
      <section class="request-panel"><div class="panel-heading"><div><h2>{{ t('dashboard.recent') }}</h2><p>{{ t('dashboard.realtime') }}</p></div><RouterLink to="/console/logs">{{ t('dashboard.viewAll') }} <ArrowUpRight :size="13" /></RouterLink></div><div class="request-table responsive-table"><table><thead><tr><th>{{ t('dashboard.requestId') }}</th><th>{{ t('dashboard.model') }}</th><th>{{ t('dashboard.status') }}</th><th>{{ t('dashboard.latency') }}</th><th>{{ t('dashboard.tokenCount') }}</th><th>{{ t('dashboard.cost') }}</th></tr></thead><tbody><tr v-if="!requests.length" class="table-empty"><td colspan="6">暂无调用记录</td></tr><tr v-for="row in requests" :key="row.id"><td :data-label="t('dashboard.requestId')"><code>{{ row.requestId }}</code></td><td :data-label="t('dashboard.model')">{{ row.modelName }}</td><td :data-label="t('dashboard.status')"><span :class="['success-dot', { failed: row.status === 'failed' }]"><i />{{ row.status === 'success' ? t('dashboard.success') : t('dashboard.failed') }}</span></td><td :data-label="t('dashboard.latency')">{{ row.latencyMs }} ms</td><td :data-label="t('dashboard.tokenCount')">{{ row.tokenCount.toLocaleString() }}</td><td :data-label="t('dashboard.cost')">¥{{ row.costCny.toFixed(4) }}</td></tr></tbody></table></div></section>
    </template>
  </ConsoleShell>
</template>
