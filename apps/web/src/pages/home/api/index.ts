import type { ModelListResponse, RankingListResponse } from '@gateway/contracts'
import { request } from '../../../lib/http'
import { homeEndpoints } from './endpoints'
import type { HomeData } from './types'

export async function getHomeData(signal?: AbortSignal): Promise<HomeData> {
  const [models, rankings] = await Promise.all([
    request<ModelListResponse>({ url: homeEndpoints.models, params: { pageSize: 100, sort: 'recommended' }, signal }),
    request<RankingListResponse>({ url: homeEndpoints.rankings, params: { metric: 'overall', limit: 3 }, signal }),
  ])
  return { models, rankings }
}

export { homeEndpoints }
export type * from './types'
