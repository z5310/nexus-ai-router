export type { CatalogModel, ModelListResponse, ModelType, AudioGenerationInput, AudioGenerationTask, AudioGenerationTaskStatus, AudioResponseFormat } from '@gateway/contracts'
export interface ModelListQuery { pageSize?: number; signal?: AbortSignal }
