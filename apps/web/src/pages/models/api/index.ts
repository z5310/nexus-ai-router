import type { CatalogModel, ModelListResponse } from '@gateway/contracts'
import { request } from '../../../lib/http'
import { modelEndpoints } from './endpoints'
import type { ModelListQuery } from './types'

export const listModels = ({ pageSize = 100, signal }: ModelListQuery = {}) => request<ModelListResponse>({ url: modelEndpoints.list, params: { pageSize }, signal })
export const getModel = (publicId: string, signal?: AbortSignal) => request<CatalogModel>({ url: modelEndpoints.detail(publicId), signal })
export { modelEndpoints }
export type * from './types'
