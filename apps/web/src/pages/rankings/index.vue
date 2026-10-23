<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import type { ModelType, RankingEntry, RankingMetric } from './api'
import { ArrowDown, ArrowRight, ArrowUp, BarChart3, CircleDollarSign, Clock3, Flame, Gauge, MousePointerClick, ShieldCheck, Sparkles, Trophy } from 'lucide-vue-next'
import SiteHeader from '../../components/SiteHeader.vue'
import ModelLogo from '../../components/ModelLogo.vue'
import { listRankings } from './api'

const { t } = useI18n()
const metric = ref<RankingMetric>('overall')
const metrics: RankingMetric[] = ['overall', 'coding', 'cost', 'speed']
type RankingCategory = ModelType | 'all'
const vendor = ref('all')
const status = ref('all')
const category = ref<RankingCategory>('all')
const categories: RankingCategory[] = ['all', 'text', 'image', 'video', 'audio', 'embedding']
const rankingQuery = useQuery({
  queryKey: ['model-rankings'],
  queryFn: async ({ signal }) => {
    const responses = await Promise.all(metrics.map((item) => listRankings(item, signal)))
    return Object.fromEntries(responses.map((response) => [response.metric, response])) as Record<RankingMetric, typeof responses[number]>
  },
  staleTime: 60_000,
  retry: 1,
})

const visibleRankings = computed(() => {
  let rows = [...(rankingQuery.data.value?.[metric.value]?.data ?? [])]
  if (vendor.value !== 'all') rows = rows.filter((row) => row.provider === vendor.value)
  if (status.value !== 'all') rows = rows.filter((row) => row.status === status.value)
  return rows.map((row, index) => ({ ...row, displayRank: index + 1 }))
})
const overallRows = computed(() => rankingQuery.data.value?.overall.data ?? [])
const overallLeader = computed(() => overallRows.value[0] ?? null)
const costLeader = computed(() => rankingQuery.data.value?.cost.data[0] ?? null)
const speedLeader = computed(() => rankingQuery.data.value?.speed.data[0] ?? null)
const usageLeader = computed(() => [...overallRows.value].sort((a, b) => b.calls7d - a.calls7d)[0] ?? null)
const providers = computed(() => [...new Set(overallRows.value.map((model) => model.provider))])
const categoryLeaders = computed(() => overallRows.value.filter((model) => category.value === 'all' || model.type === category.value).slice(0, 5))
const rankBy = (key: 'score' | 'usageShare' | 'weeklyGrowth') => [...overallRows.value].sort((a, b) => (b[key] ?? Number.NEGATIVE_INFINITY) - (a[key] ?? Number.NEGATIVE_INFINITY)).slice(0, 5)
const specialtyBoards = computed(() => [
  { key: 'overallBoard', unit: t('ranking.points'), rows: rankBy('score'), value: (model: RankingEntry) => model.score, max: 100 },
  { key: 'usageBoard', unit: t('ranking.usageUnit'), rows: rankBy('usageShare'), value: (model: RankingEntry) => model.usageShare, max: Math.max(...overallRows.value.map((model) => model.usageShare), 1) },
  { key: 'heatBoard', unit: t('ranking.growthUnit'), rows: rankBy('weeklyGrowth'), value: (model: RankingEntry) => model.weeklyGrowth ?? 0, max: Math.max(...overallRows.value.map((model) => model.weeklyGrowth ?? 0), 1) },
])
const providerLabel = (provider: string) => provider === '阿里云' ? t('common.providers.alibaba') : provider === '字节跳动' ? t('common.providers.bytedance') : provider
const contextLabel = (context: string) => context === '视频' ? t('common.types.video') : context === '图像' ? t('common.types.image') : context === '音频' ? t('common.types.audio') : context
const speedLabel = (latencyMs: number) => latencyMs >= 1000 ? `${(latencyMs / 1000).toFixed(1)} s` : `${latencyMs} ms`
const compactNumber = (value: number) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
const categoryLabel = (value: RankingCategory | ModelType) => t(`common.types.${value}`)
const updatedAt = computed(() => {
  const value = rankingQuery.data.value?.[metric.value]?.updatedAt
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
})
</script>

<template>
  <div class="ranking-page">
    <SiteHeader />
    <main class="ranking-main">
      <header v-reveal class="ranking-hero ranking-discovery-hero">
        <div>
          <span class="section-kicker"><BarChart3 :size="14" /> {{ t('ranking.kicker') }}</span>
          <h1>{{ t('ranking.title') }}</h1><p>{{ t('ranking.subtitle') }}</p>
        </div>
        <div class="ranking-snapshot"><Clock3 :size="16" /><span>{{ t('ranking.snapshot') }}</span><b>{{ t('ranking.today') }}</b></div>
      </header>

      <nav v-reveal="{ delay: 70 }" class="ranking-category-tabs" :aria-label="t('ranking.categoryLabel')">
        <button v-for="item in categories" :key="item" :class="{ active: category === item }" @click="category = item">{{ categoryLabel(item) }}</button>
      </nav>

      <section class="ranking-overview">
        <article v-reveal class="category-top-card">
          <header><div><span>{{ t('ranking.categoryTop') }}</span><h2>{{ t('ranking.categoryTitle', { category: categoryLabel(category) }) }}</h2></div><small>{{ t('ranking.updatedDaily') }}</small></header>
          <ol>
            <li v-for="(model, index) in categoryLeaders" :key="model.slug">
              <b class="overview-rank">{{ index + 1 }}</b>
              <ModelLogo :owner="model.owner" :provider="model.provider" :name="model.name" :accent="model.accent" :size="38" />
              <div class="overview-model"><strong>{{ model.name }}</strong><small>{{ providerLabel(model.provider) }} · {{ categoryLabel(model.type) }}</small></div>
              <span class="overview-status"><i />{{ t('common.stable') }}</span>
              <div class="overview-score"><i><em :style="{ width: `${model.score}%` }" /></i><b>{{ model.score }}</b></div>
            </li>
          </ol>
          <div v-if="!categoryLeaders.length" class="data-state-banner">{{ rankingQuery.isLoading.value ? t('common.loading') : t('catalog.noMatch') }}</div>
          <div v-if="categoryLeaders.length === 1" class="category-note"><Sparkles :size="15" />{{ t('ranking.categorySingle') }}</div>
        </article>

        <div class="ranking-highlights">
          <article v-if="overallLeader" v-reveal="{ delay: 70 }"><span class="highlight-icon gold"><Trophy :size="18" /></span><small>{{ t('ranking.overallLeader') }}</small><h3>{{ overallLeader.name }}</h3><p>{{ overallLeader.score }} <em>{{ t('ranking.points') }}</em></p></article>
          <article v-if="costLeader" v-reveal="{ delay: 140 }"><span class="highlight-icon green"><CircleDollarSign :size="18" /></span><small>{{ t('ranking.costLeader') }}</small><h3>{{ costLeader.name }}</h3><p>¥{{ costLeader.costPerTask.toFixed(2) }} <em>{{ t('ranking.taskCost') }}</em></p></article>
          <article v-if="speedLeader" v-reveal="{ delay: 210 }"><span class="highlight-icon blue"><Gauge :size="18" /></span><small>{{ t('ranking.speedLeader') }}</small><h3>{{ speedLeader.name }}</h3><p>{{ speedLabel(speedLeader.latencyMs) }} <em>{{ t('ranking.firstLatency') }}</em></p></article>
          <article v-if="usageLeader" v-reveal="{ delay: 280 }"><span class="highlight-icon hot"><MousePointerClick :size="18" /></span><small>{{ t('ranking.usageLeader') }}</small><h3>{{ usageLeader.name }}</h3><p>{{ compactNumber(usageLeader.calls7d) }} <em>{{ t('ranking.calls7d') }}</em></p></article>
        </div>
      </section>

      <section class="specialty-section">
        <div v-reveal class="ranking-section-heading"><div><span>{{ t('ranking.specialtyKicker') }}</span><h2>{{ t('ranking.specialtyTitle') }}</h2></div><p>{{ t('ranking.specialtyDesc') }}</p></div>
        <div class="specialty-grid">
          <article v-for="(board, index) in specialtyBoards" :key="board.key" v-reveal="{ delay: index * 80 }" class="specialty-card">
            <header><div><Flame v-if="board.key === 'heatBoard'" :size="17" /><BarChart3 v-else :size="17" /><h3>{{ t(`ranking.${board.key}`) }}</h3></div><span>TOP 5</span></header>
            <ol>
              <li v-for="(model, index) in board.rows" :key="model.slug">
                <b>{{ index + 1 }}</b><ModelLogo :owner="model.owner" :provider="model.provider" :name="model.name" :accent="model.accent" :size="30" />
                <div><strong>{{ model.name }}</strong><i><em :style="{ width: `${Math.min(100, board.value(model) / board.max * 100)}%` }" /></i></div>
                <span>{{ board.key === 'heatBoard' && model.weeklyGrowth === null ? '—' : `${board.key === 'heatBoard' ? '+' : ''}${board.value(model)}${board.unit}` }}</span>
              </li>
            </ol>
          </article>
        </div>
      </section>

      <section v-reveal class="benchmark-note"><Sparkles :size="18" /><div><b>{{ t('ranking.methodTitle') }}</b><p>{{ t('ranking.methodDesc') }}</p></div><a href="/docs" target="_blank" rel="noopener noreferrer">{{ t('ranking.methodLink') }} <ArrowRight :size="14" /></a></section>

      <section v-reveal class="leaderboard-section" id="model-discovery-full-ranking">
        <div v-if="rankingQuery.isLoading.value" class="data-state-banner">{{ t('common.loading') }}</div>
        <div v-else-if="rankingQuery.isError.value" class="data-state-banner warning">{{ t('common.loadError') }}</div>
        <div v-else class="data-state-banner live">{{ t('ranking.sourceReady') }}</div>
        <div class="leaderboard-heading"><div><span>FULL METRIC LEADERBOARD</span><h2>{{ t('ranking.full') }}</h2></div><div class="leaderboard-controls"><div class="metric-switcher"><button v-for="item in metrics" :key="item" :class="{ active: metric === item }" @click="metric = item">{{ t(`ranking.${item}`) }}</button></div><div class="table-filters"><select v-model="vendor"><option value="all">{{ t('ranking.allVendors') }}</option><option v-for="provider in providers" :key="provider" :value="provider">{{ providerLabel(provider) }}</option></select><select v-model="status"><option value="all">{{ t('ranking.allStatuses') }}</option><option value="stable">{{ t('common.stable') }}</option><option value="observing">{{ t('ranking.observing') }}</option></select></div></div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>{{ t('ranking.rank') }}</th><th>{{ t('ranking.model') }}</th><th>{{ t('ranking.status') }}</th><th>{{ t('ranking.score') }}</th><th>{{ t('ranking.costTask') }}</th><th>{{ t('ranking.latency') }}</th><th>{{ t('ranking.context') }}</th><th>{{ t('ranking.trend') }}</th><th /></tr></thead>
            <tbody>
              <tr v-for="row in visibleRankings" :key="row.slug">
                <td><span :class="['rank-number', { top: row.displayRank <= 3 }]">{{ String(row.displayRank).padStart(2, '0') }}</span></td>
                <td><div class="table-model"><ModelLogo :owner="row.owner" :provider="row.provider" :name="row.name" :accent="row.accent" :size="28" /><div><b>{{ row.name }}</b><small>{{ providerLabel(row.provider) }}</small></div></div></td>
                <td><span class="status-pill"><i /> {{ row.status === 'stable' ? t('common.stable') : t('ranking.observing') }}</span></td>
                <td>
                  <strong class="score-cell">{{ row.metricScore }}</strong>
                  <a v-if="row.scoreSource.url" class="score-source" :href="row.scoreSource.url" target="_blank" rel="noopener noreferrer">{{ row.scoreSource.name }}</a>
                  <span v-else class="score-source">{{ row.scoreSource.name }}</span>
                </td>
                <td>¥{{ row.costPerTask.toFixed(2) }}</td><td>{{ speedLabel(row.latencyMs) }}</td><td>{{ contextLabel(row.context) }}</td>
                <td><span :class="['trend', { down: (row.trend ?? 0) < 0 }]" v-if="row.trend !== null"><ArrowDown v-if="row.trend < 0" :size="12" /><ArrowUp v-else :size="12" />{{ Math.abs(row.trend) }}</span><span v-else>—</span></td>
                <td><a href="/console" target="_blank" rel="noopener noreferrer">{{ t('common.try') }} <ArrowRight :size="13" /></a></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="table-foot"><span><ShieldCheck :size="14" /> {{ t('ranking.updated', { time: updatedAt }) }}</span><span>{{ t('ranking.total', { count: visibleRankings.length }) }}</span></div>
      </section>
    </main>
  </div>
</template>
