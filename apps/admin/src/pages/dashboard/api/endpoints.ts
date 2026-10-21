export const adminEndpoints = {
  modelSummary: '/api/admin/models/summary',
  models: '/api/admin/models',
  model: (id: string) => `/api/admin/models/${id}`,
  userSummary: '/api/admin/users/summary',
  users: '/api/admin/users',
} as const
