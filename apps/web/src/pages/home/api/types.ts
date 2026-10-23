import type { ModelListResponse, RankingListResponse } from '@gateway/contracts'

export interface HomeData {
  models: ModelListResponse
  rankings: RankingListResponse
}
