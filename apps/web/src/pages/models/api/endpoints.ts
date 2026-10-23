export const modelEndpoints = {
  list: '/api/models',
  detail: (publicId: string) => `/api/models/${encodeURIComponent(publicId)}`,
  audioGenerations: '/api/console/audio-generations',
  audioGeneration: (id: string) => `/api/console/audio-generations/${encodeURIComponent(id)}`,
  cancelAudioGeneration: (id: string) => `/api/console/audio-generations/${encodeURIComponent(id)}/cancel`,
} as const
