export const consoleEndpoints = {
  overview: '/api/dashboard/overview',
  requests: '/api/dashboard/requests',
  catalogModels: '/api/models',
  models: '/api/console/models',
  model: (id: string) => `/api/console/models/${id}`,
  keys: '/api/keys',
  key: (id: string) => `/api/keys/${id}`,
} as const
