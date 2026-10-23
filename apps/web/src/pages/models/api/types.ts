export type { CatalogModel, ModelListResponse, ModelType } from '@gateway/contracts'
export interface ModelListQuery { pageSize?: number; signal?: AbortSignal }

export type AudioResponseFormat = 'mp3' | 'wav' | 'flac'

export interface AudioGenerationInput {
  model: string
  prompt: string
  voice: string
  instruction?: string
  language?: string
  speech_rate: number
  pitch: number
  volume: number
  sample_rate: number
  bitrate: number
  response_format: AudioResponseFormat
}
