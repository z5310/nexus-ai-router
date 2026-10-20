<script setup lang="ts">
import { ArrowLeft, ArrowRight, Check, Clock3, Code2, Coins, Gauge, Layers3 } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import type { CatalogModel } from '@gateway/contracts'
import SiteHeader from '../components/SiteHeader.vue'
import ModelLogo from '../components/ModelLogo.vue'
import { models } from '../data/models'
import { getJson } from '../lib/api-client'

const route = useRoute()
const { t } = useI18n()
const slug = computed(() => `${route.params.provider}/${route.params.model}`)
const fallback = computed(() => models.find((item) => item.slug === slug.value) ?? models[0])
const modelQuery = useQuery({ queryKey: computed(() => ['model-detail', slug.value]), queryFn: ({ signal }) => getJson<CatalogModel>(`/api/models/${encodeURIComponent(slug.value)}`, signal), staleTime: 60_000, retry: 1 })
const model = computed(() => modelQuery.data.value ?? fallback.value)
const price = (value: number | null) => value === null ? '—' : `¥${value.toFixed(2)}`
</script>

<template>
  <div class="catalog-page"><SiteHeader /><main class="model-detail-main">
    <RouterLink class="detail-back" to="/models"><ArrowLeft :size="14" />{{ t('modelDetail.back') }}</RouterLink>
    <div v-if="modelQuery.isError.value" class="data-state-banner warning">{{ t('common.fallbackData') }}</div>
    <section class="model-detail-hero"><div><ModelLogo :owner="model.owner" :provider="model.provider" :name="model.name" :accent="model.accent" :size="48" /><p>{{ model.provider }} · {{ t(`common.types.${model.type}`) }}</p><h1>{{ model.name }}</h1><code>{{ model.slug }}</code><p class="detail-description">{{ t(model.descriptionKey) }}</p><div class="detail-actions"><a href="/console" target="_blank" rel="noopener noreferrer" class="button button-light">{{ t('catalog.startNow') }}</a><a href="/docs" target="_blank" rel="noopener noreferrer" class="button button-dark"><Code2 :size="15" />{{ t('common.docs') }}</a></div></div><div class="detail-score"><Gauge :size="24" /><strong>{{ model.score }}</strong><span>{{ t('catalog.score') }}</span></div></section>
    <section class="detail-stat-grid"><article><Coins :size="18" /><span>{{ t('catalog.inputPrice') }}</span><strong>{{ price(model.inputPrice) }}</strong></article><article><Coins :size="18" /><span>{{ t('catalog.outputPrice') }}</span><strong>{{ price(model.outputPrice) }}</strong></article><article><Clock3 :size="18" /><span>{{ t('catalog.firstToken') }}</span><strong>{{ model.latencyMs >= 1000 ? `${(model.latencyMs / 1000).toFixed(1)}s` : `${model.latencyMs}ms` }}</strong></article><article><Layers3 :size="18" /><span>{{ t('ranking.context') }}</span><strong>{{ model.context }}</strong></article></section>
    <section class="model-detail-content"><article><span class="section-kicker">CAPABILITIES</span><h2>{{ t('modelDetail.capabilities') }}</h2><ul><li v-for="capability in model.capabilities" :key="capability"><Check :size="15" />{{ t(`modelDetail.capability.${capability}`) }}</li></ul></article><article class="detail-code"><header><span>POST /v1/chat/completions</span><b>200 OK</b></header><pre><code>curl https://api.nexus.cn/v1/chat/completions \
  -H "Authorization: Bearer $NEXUS_KEY" \
  -d '{ "model": "{{ model.slug }}" }'</code></pre><a href="/docs" target="_blank" rel="noopener noreferrer">{{ t('modelDetail.viewApi') }} <ArrowRight :size="13" /></a></article></section>
  </main></div>
</template>
