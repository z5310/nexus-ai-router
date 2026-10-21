export const modelEndpoints = {
  list: '/api/models',
  detail: (publicId: string) => `/api/models/${encodeURIComponent(publicId)}`,
} as const
