import type { CatalogModel, ModelType } from '@gateway/contracts'

export type RankingCategory = 'all' | ModelType

export interface ModelPopularitySignal {
  calls7d: number
  usageShare: number
  weeklyGrowth: number
}

export interface RankedModelInsight extends CatalogModel, ModelPopularitySignal {}

const popularityBySlug: Record<string, ModelPopularitySignal> = {
  'openai/gpt-6.1-sol': { calls7d: 128430, usageShare: 24.8, weeklyGrowth: 18.4 },
  'anthropic/claude-sonnet-5.5': { calls7d: 96320, usageShare: 18.6, weeklyGrowth: 11.2 },
  'deepseek/deepseek-v4.1-flash': { calls7d: 87460, usageShare: 16.9, weeklyGrowth: 32.8 },
  'alibaba/qwen-3.8-max': { calls7d: 64180, usageShare: 12.4, weeklyGrowth: 27.6 },
  'google/gemini-3-flash': { calls7d: 55920, usageShare: 10.8, weeklyGrowth: 8.7 },
  'bytedance/seedance-2.5': { calls7d: 35240, usageShare: 6.8, weeklyGrowth: 46.5 },
  'bytedance/seedream-5': { calls7d: 25390, usageShare: 4.9, weeklyGrowth: 21.3 },
  'minimax/speech-3': { calls7d: 16060, usageShare: 3.1, weeklyGrowth: 14.9 },
  'baai/bge-m3': { calls7d: 8810, usageShare: 1.7, weeklyGrowth: 6.8 },
}

const emptySignal: ModelPopularitySignal = { calls7d: 0, usageShare: 0, weeklyGrowth: 0 }

export function withPopularity(models: CatalogModel[]): RankedModelInsight[] {
  return models.map((model) => ({ ...model, ...(popularityBySlug[model.slug] ?? emptySignal) }))
}

export function categoryRankings(models: RankedModelInsight[], category: RankingCategory) {
  return models
    .filter((model) => category === 'all' || model.type === category)
    .sort((a, b) => b.score - a.score)
}

export function rankBy<K extends keyof Pick<RankedModelInsight, 'score' | 'usageShare' | 'weeklyGrowth'>>(
  models: RankedModelInsight[],
  field: K,
) {
  return [...models].sort((a, b) => b[field] - a[field])
}
