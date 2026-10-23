export const adminEndpoints = {
  modelSummary: '/api/admin/models/summary',
  models: '/api/admin/models',
  model: (id: string) => `/api/admin/models/${id}`,
  modelPricing: (id: string) => `/api/admin/models/${id}/pricing`,
  userSummary: '/api/admin/users/summary',
  users: '/api/admin/users',
  credentials: '/api/admin/provider-credentials',
  credential: (id: string) => `/api/admin/provider-credentials/${id}`,
  channels: '/api/admin/provider-channels',
  channel: (id: string) => `/api/admin/provider-channels/${id}`,
  deployments: '/api/admin/model-deployments',
  deployment: (id: string) => `/api/admin/model-deployments/${id}`,
} as const
