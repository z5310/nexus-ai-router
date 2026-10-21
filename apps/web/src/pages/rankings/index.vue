<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import type { ModelType, RankingMetric } from './api'
import { ArrowDown, ArrowRight, ArrowUp, BarChart3, CircleDollarSign, Clock3, Flame, Gauge, MousePointerClick, ShieldCheck, Sparkles, Trophy } from 'lucide-vue-next'
import SiteHeader from '../../components/SiteHeader.vue'
import ModelLogo from '../../components/ModelLogo.vue'
import { fallbackRankings, models } from '../../data/models'
import { categoryRankings, rankBy, withPopularity, type RankingCategory } from '../../data/ranking-insights'
import { listRankings } from './api'

const { t } = useI18n()
const metric = ref<RankingMetric>('overall')
const metrics: RankingMetric[] = ['overall', 'coding', 'cost', 'speed']
const vendor = ref('all')
const status = ref('all')
const category = ref<RankingCategory>('all')
const categories: RankingCategory[] = ['all', 'text', 'image', 'video', 'audio', 'embedding']
const insightModels = withPopularity(models)

const rankingQuery = useQuery({
  queryKey: computed(() => ['model-rankings', metric.value]),
  queryFn: ({ signal }) => listRankings(metric.value, signal),
  staleTime: 60_000,
  retry: 1,
})

const visibleRankings = computed(() => {
  let rows = [...(rankingQuery.data.value?.data ?? fallbackRankings(metric.value))]
  if (vendor.value !== 'all') rows = rows.filter((row) => row.provider === vendor.value)
  if (status.value !== 'all') rows = rows.filter((row) => row.status === status.value)
  return rows.map((row, index) => ({ ...row, displayRank: index + 1 }))
})
const overallLeader = fallbackRankings('overall')[0]
const costLeader = fallbackRankings('cost')[0]
const speedLeader = fallbackRankings('speed')[0]
const usageLeader = rankBy(insightModels, 'usageShare')[0]
const categoryLeaders = computed(() => categoryRankings(insightModels, category.value).slice(0, 5))
const specialtyBoards = computed(() => [
  { key: 'overallBoard', unit: t('ranking.points'), rows: rankBy(insightModels, 'score').slice(0, 5), value: (model: typeof insightModels[number]) => model.score, max: 100 },
  { key: 'usageBoard', unit: t('ranking.usageUnit'), rows: rankBy(insightModels, 'usageShare').slice(0, 5), value: (model: typeof insightModels[number]) => model.usageShare, max: 28 },
  { key: 'heatBoard', unit: t('ranking.growthUnit'), rows: rankBy(insightModels, 'weeklyGrowth').slice(0, 5), value: (model: typeof insightModels[number]) => model.weeklyGrowth, max: 50 },
])
const providerLabel = (provider: string) => provider === '阿里云' ? t('common.providers.alibaba') : provider === '字节跳动' ? t('common.providers.bytedance') : provider
const contextLabel = (context: string) => context === '视频' ? t('common.types.video') : context === '图像' ? t('common.types.image') : context === '音频' ? t('common.types.audio') : context
const speedLabel = (latencyMs: number) => latencyMs >= 1000 ? `${(latencyMs / 1000).toFixed(1)} s` : `${latencyMs} ms`
const compactNumber = (value: number) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
const categoryLabel = (value: RankingCategory | ModelType) => t(`common.types.${value}`)
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
          <div v-if="categoryLeaders.length === 1" class="category-note"><Sparkles :size="15" />{{ t('ranking.categorySingle') }}</div>
        </article>

        <div class="ranking-highlights">
          <article v-reveal="{ delay: 70 }"><span class="highlight-icon gold"><Trophy :size="18" /></span><small>{{ t('ranking.overallLeader') }}</small><h3>{{ overallLeader.name }}</h3><p>{{ overallLeader.score }} <em>{{ t('ranking.points') }}</em></p></article>
          <article v-reveal="{ delay: 140 }"><span class="highlight-icon green"><CircleDollarSign :size="18" /></span><small>{{ t('ranking.costLeader') }}</small><h3>{{ costLeader.name }}</h3><p>¥{{ costLeader.costPerTask.toFixed(2) }} <em>{{ t('ranking.taskCost') }}</em></p></article>
          <article v-reveal="{ delay: 210 }"><span class="highlight-icon blue"><Gauge :size="18" /></span><small>{{ t('ranking.speedLeader') }}</small><h3>{{ speedLeader.name }}</h3><p>{{ speedLabel(speedLeader.latencyMs) }} <em>{{ t('ranking.firstLatency') }}</em></p></article>
          <article v-reveal="{ delay: 280 }"><span class="highlight-icon hot"><MousePointerClick :size="18" /></span><small>{{ t('ranking.usageLeader') }}</small><h3>{{ usageLeader.name }}</h3><p>{{ compactNumber(usageLeader.calls7d) }} <em>{{ t('ranking.calls7d') }}</em></p></article>
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
                <span>{{ board.key === 'heatBoard' ? '+' : '' }}{{ board.value(model) }}{{ board.unit }}</span>
              </li>
            </ol>
          </article>
        </div>
      </section>

      <section v-reveal class="benchmark-note"><Sparkles :size="18" /><div><b>{{ t('ranking.methodTitle') }}</b><p>{{ t('ranking.methodDesc') }}</p></div><a href="/docs" target="_blank" rel="noopener noreferrer">{{ t('ranking.methodLink') }} <ArrowRight :size="14" /></a></section>

      <section v-reveal class="leaderboard-section" id="model-discovery-full-ranking">
        <div v-if="rankingQuery.isLoading.value" class="data-state-banner">{{ t('common.loading') }}</div>
        <div v-else-if="rankingQuery.isError.value" class="data-state-banner warning">{{ t('common.fallbackData') }}</div>
        <div v-else class="data-state-banner live">{{ t('common.liveData') }}</div>
        <div class="leaderboard-heading"><div><span>FULL METRIC LEADERBOARD</span><h2>{{ t('ranking.full') }}</h2></div><div class="leaderboard-controls"><div class="metric-switcher"><button v-for="item in metrics" :key="item" :class="{ active: metric === item }" @click="metric = item">{{ t(`ranking.${item}`) }}</button></div><div class="table-filters"><select v-model="vendor"><option value="all">{{ t('ranking.allVendors') }}</option><option>OpenAI</option><option>Anthropic</option><option>DeepSeek</option><option value="阿里云">{{ t('common.providers.alibaba') }}</option><option>Google</option><option value="字节跳动">{{ t('common.providers.bytedance') }}</option></select><select v-model="status"><option value="all">{{ t('ranking.allStatuses') }}</option><option value="stable">{{ t('common.stable') }}</option><option value="observing">{{ t('ranking.observing') }}</option></select></div></div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>{{ t('ranking.rank') }}</th><th>{{ t('ranking.model') }}</th><th>{{ t('ranking.status') }}</th><th>{{ t('ranking.score') }}</th><th>{{ t('ranking.costTask') }}</th><th>{{ t('ranking.latency') }}</th><th>{{ t('ranking.context') }}</th><th>{{ t('ranking.trend') }}</th><th /></tr></thead>
            <tbody>
              <tr v-for="row in visibleRankings" :key="row.slug">
                <td><span :class="['rank-number', { top: row.displayRank <= 3 }]">{{ String(row.displayRank).padStart(2, '0') }}</span></td>
                <td><div class="table-model"><ModelLogo :owner="row.owner" :provider="row.provider" :name="row.name" :accent="row.accent" :size="28" /><div><b>{{ row.name }}</b><small>{{ providerLabel(row.provider) }}</small></div></div></td>
                <td><span class="status-pill"><i /> {{ row.status === 'stable' ? t('common.stable') : t('ranking.observing') }}</span></td><td><strong class="score-cell">{{ row.metricScore }}</strong></td><td>¥{{ row.costPerTask.toFixed(2) }}</td><td>{{ speedLabel(row.latencyMs) }}</td><td>{{ contextLabel(row.context) }}</td>
                <td><span :class="['trend', { down: (row.trend ?? 0) < 0 }]" v-if="row.trend !== null"><ArrowDown v-if="row.trend < 0" :size="12" /><ArrowUp v-else :size="12" />{{ Math.abs(row.trend) }}</span><span v-else>—</span></td>
                <td><a href="/console" target="_blank" rel="noopener noreferrer">{{ t('common.try') }} <ArrowRight :size="13" /></a></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="table-foot"><span><ShieldCheck :size="14" /> {{ t('ranking.updated') }}</span><span>{{ t('ranking.total', { count: visibleRankings.length }) }}</span></div>
      </section>
    </main>
  </div>
</template>
