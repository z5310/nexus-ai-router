export type { CatalogModel, ModelListResponse, ModelType } from '@gateway/contracts'
export interface ModelListQuery { pageSize?: number; signal?: AbortSignal }
