export const authEndpoints = {
  login: '/api/auth/login',
  changePassword: '/api/auth/change-password',
  refresh: '/api/auth/refresh',
  logout: '/api/auth/logout',
  sessions: '/api/auth/sessions',
  session: (id: string) => `/api/auth/sessions/${encodeURIComponent(id)}`,
} as const
