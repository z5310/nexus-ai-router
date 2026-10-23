import type { AudioGenerationInput, AudioGenerationTask, AudioGenerationTaskListResponse, CatalogModel, ModelListResponse } from '@gateway/contracts'
import { request } from '../../../lib/http'
import { modelEndpoints } from './endpoints'
import type { ModelListQuery } from './types'

export const listModels = ({ pageSize = 100, signal }: ModelListQuery = {}) => request<ModelListResponse>({ url: modelEndpoints.list, params: { pageSize }, signal })
export const getModel = (publicId: string, signal?: AbortSignal) => request<CatalogModel>({ url: modelEndpoints.detail(publicId), signal })
export const createAudioGeneration = (input: AudioGenerationInput) => request<AudioGenerationTask>({ url: modelEndpoints.audioGenerations, method: 'POST', data: input })
export const listAudioGenerations = (model: string, signal?: AbortSignal) => request<AudioGenerationTaskListResponse>({ url: modelEndpoints.audioGenerations, params: { model, limit: 10 }, signal })
export const getAudioGeneration = (id: string, signal?: AbortSignal) => request<AudioGenerationTask>({ url: modelEndpoints.audioGeneration(id), signal })
export const cancelAudioGeneration = (id: string) => request<AudioGenerationTask>({ url: modelEndpoints.cancelAudioGeneration(id), method: 'POST' })
export { modelEndpoints }
export type * from './types'
