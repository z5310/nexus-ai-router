export const authEndpoints = {
  register: '/api/auth/register',
  login: '/api/auth/login',
  forgotPassword: '/api/auth/forgot-password',
  resetPassword: '/api/auth/reset-password',
  changePassword: '/api/auth/change-password',
  refresh: '/api/auth/refresh',
  logout: '/api/auth/logout',
  sessions: '/api/auth/sessions',
  session: (id: string) => `/api/auth/sessions/${encodeURIComponent(id)}`,
  github: '/api/auth/oauth/github',
  google: '/api/auth/oauth/google',
} as const
