import type { RankingListResponse, RankingMetric } from '@gateway/contracts'
import { request } from '../../../lib/http'
import { rankingEndpoints } from './endpoints'

export const listRankings = (metric: RankingMetric, signal?: AbortSignal) => request<RankingListResponse>({ url: rankingEndpoints.list, params: { metric }, signal })
export { rankingEndpoints }
export type * from './types'
