<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import type { ModelListResponse, ModelType } from './api'
import { ArrowRight, BarChart3, Check, ChevronDown, CircleDollarSign, Filter, Search } from 'lucide-vue-next'
import ModelLogo from '../../components/ModelLogo.vue'
import ModelRoutingVisual from './cmp/ModelRoutingVisual.vue'
import SiteHeader from '../../components/SiteHeader.vue'
import { models } from '../../data/models'
import { listModels } from './api'

const search = ref('')
const { t, locale } = useI18n()
const activeType = ref<ModelType | 'all'>('all')
const activeProvider = ref('all')
const sort = ref('recommended')
const showFilters = ref(false)
const types: Array<ModelType | 'all'> = ['all', 'text', 'image', 'video', 'audio', 'embedding']
const providers = ['all', 'OpenAI', 'Anthropic', 'DeepSeek', '阿里云', 'Google', '字节跳动', 'MiniMax', 'BAAI']

const modelQuery = useQuery({
  queryKey: ['catalog-models'],
  queryFn: ({ signal }) => listModels({ pageSize: 100, signal }),
  staleTime: 60_000,
  retry: 1,
})
const catalogModels = computed(() => modelQuery.data.value?.data ?? models)

const filteredModels = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  const result = catalogModels.value.filter((model) =>
    (activeType.value === 'all' || model.type === activeType.value) &&
    (activeProvider.value === 'all' || model.provider === activeProvider.value) &&
    (!keyword || `${model.name} ${model.slug} ${model.provider} ${providerLabel(model.provider)}`.toLowerCase().includes(keyword)),
  )
  if (sort.value === 'score') return [...result].sort((a, b) => b.score - a.score)
  if (sort.value === 'speed') return [...result].sort((a, b) => a.latencyMs - b.latencyMs)
  if (sort.value === 'price') return [...result].sort((a, b) => a.inputPrice - b.inputPrice)
  return [...result].sort((a, b) => Number(b.featured) - Number(a.featured) || b.score - a.score)
})

const typeLabel = (type: ModelType | 'all') => t(`common.types.${type}`)
const providerLabel = (provider: string) => provider === 'all' ? t('common.providers.all') : provider === '阿里云' ? t('common.providers.alibaba') : provider === '字节跳动' ? t('common.providers.bytedance') : provider
const priceSuffix = (unit: ModelListResponse['data'][number]['priceUnit']) => ({
  million_tokens: '', image: locale.value === 'en-US' ? '/ image' : '/张', second: locale.value === 'en-US' ? '/ sec' : '/秒', '10k_chars': locale.value === 'en-US' ? '/ 10K chars' : '/万字',
})[unit]
const displayPrice = (price: number | null, unit: ModelListResponse['data'][number]['priceUnit']) => price === null ? '—' : `¥${price.toFixed(2)}${priceSuffix(unit)}`
const typeCount = (type: ModelType | 'all') => type === 'all' ? catalogModels.value.length : catalogModels.value.filter((model) => model.type === type).length
const providerCount = (provider: string) => provider === 'all' ? catalogModels.value.length : catalogModels.value.filter((model) => model.provider === provider).length
</script>

<template>
  <div class="catalog-page">
    <SiteHeader />
    <main class="catalog-main">
      <header v-reveal class="page-heading">
        <div><span class="section-kicker">{{ t('catalog.kicker') }}</span><h1>{{ t('catalog.title') }}</h1><p>{{ t('catalog.subtitle') }}</p></div>
        <div class="confidence-chips"><span><Check :size="13" /> {{ t('catalog.compatible') }}</span><span><CircleDollarSign :size="13" /> {{ t('catalog.official') }}</span><span><Check :size="13" /> {{ t('catalog.sla') }}</span></div>
      </header>

      <section v-reveal="{ delay: 80 }" class="featured-model">
        <div class="featured-copy"><span>{{ t('catalog.featured') }}</span><h2>GPT-6.1 Sol</h2><p>{{ t('catalog.featuredDesc') }}</p><div><a href="/console" target="_blank" rel="noopener noreferrer" class="button button-green">{{ t('catalog.startNow') }} <ArrowRight :size="15" /></a><RouterLink class="button button-ghost" to="/models/openai/gpt-6.1-sol">{{ t('common.details') }}</RouterLink></div></div>
        <ModelRoutingVisual />
      </section>

      <div v-reveal class="catalog-tools">
        <label class="search-box"><Search :size="18" /><input v-model="search" :placeholder="t('catalog.placeholder')" /></label>
        <select v-model="sort" aria-label="Sort"><option value="recommended">{{ t('catalog.recommended') }}</option><option value="score">{{ t('catalog.highestScore') }}</option><option value="speed">{{ t('catalog.fastest') }}</option><option value="price">{{ t('catalog.lowestPrice') }}</option></select>
        <RouterLink class="ranking-button" to="/rankings"><BarChart3 :size="17" /> {{ t('catalog.ranking') }} <ArrowRight :size="14" /></RouterLink>
        <button class="mobile-filter-button" @click="showFilters = !showFilters"><Filter :size="16" /> {{ t('catalog.filter') }}</button>
      </div>

      <div v-reveal="{ delay: 60 }" class="type-tabs">
        <button v-for="type in types" :key="type" :class="{ active: activeType === type }" @click="activeType = type">{{ typeLabel(type) }} <span>{{ typeCount(type) }}</span></button>
      </div>

      <div class="catalog-layout">
        <aside v-reveal :class="['filter-panel', { open: showFilters }]">
          <div class="filter-title"><b>{{ t('catalog.filter') }}</b><button @click="activeProvider = 'all'; activeType = 'all'; search = ''">{{ t('common.reset') }}</button></div>
          <div class="filter-group"><span>{{ t('catalog.provider') }} <ChevronDown :size="14" /></span><button v-for="provider in providers" :key="provider" :class="{ active: activeProvider === provider }" @click="activeProvider = provider"><i />{{ providerLabel(provider) }}<small>{{ providerCount(provider) }}</small></button></div>
          <div class="filter-group compact"><span>{{ t('catalog.capability') }} <ChevronDown :size="14" /></span><label><input type="checkbox" checked /> {{ t('catalog.streaming') }}</label><label><input type="checkbox" /> {{ t('catalog.tools') }}</label><label><input type="checkbox" /> {{ t('catalog.vision') }}</label></div>
        </aside>

        <section class="model-results">
          <div v-if="modelQuery.isLoading.value" class="data-state-banner">{{ t('common.loading') }}</div>
          <div v-else-if="modelQuery.isError.value" class="data-state-banner warning">{{ t('common.fallbackData') }}</div>
          <div v-else class="data-state-banner live">{{ t('common.liveData') }}</div>
          <div class="results-meta"><span>{{ t('catalog.found', { count: filteredModels.length }) }}</span><span>{{ t('catalog.cny') }}</span></div>
          <div class="model-grid">
            <article v-for="(model, index) in filteredModels" :key="model.slug" v-reveal="{ delay: (index % 3) * 70 }" class="model-card">
              <div class="card-top"><ModelLogo :owner="model.owner" :provider="model.provider" :name="model.name" :accent="model.accent" :size="32" /><span v-if="model.tagKey" class="model-tag">{{ t(model.tagKey) }}</span><button aria-label="Compare model">+</button></div>
              <RouterLink :to="`/models/${model.slug}`"><h3>{{ model.name }}</h3></RouterLink><p class="provider-line">{{ providerLabel(model.provider) }} · {{ typeLabel(model.type) }}</p><p class="model-description">{{ t(model.descriptionKey) }}</p>
              <div class="model-specs"><span><small>{{ t('catalog.inputPrice') }}</small><b>{{ displayPrice(model.inputPrice, model.priceUnit) }}</b></span><span><small>{{ t('catalog.outputPrice') }}</small><b>{{ displayPrice(model.outputPrice, model.priceUnit) }}</b></span><span><small>{{ t('catalog.firstToken') }}</small><b>{{ model.latencyMs > 1000 ? `${(model.latencyMs / 1000).toFixed(1)}s` : `${model.latencyMs}ms` }}</b></span></div>
              <div class="card-bottom"><code>{{ model.slug }}</code><a href="/console" target="_blank" rel="noopener noreferrer">{{ t('catalog.call') }} <ArrowRight :size="13" /></a></div>
            </article>
          </div>
          <div v-if="filteredModels.length === 0" class="empty-state"><Search :size="26" /><h3>{{ t('catalog.noMatch') }}</h3><p>{{ t('catalog.noMatchDesc') }}</p></div>
        </section>
      </div>
    </main>
  </div>
</template>
