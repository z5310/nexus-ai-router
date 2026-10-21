export const authEndpoints = {
  login: '/api/auth/login',
  refresh: '/api/auth/refresh',
  logout: '/api/auth/logout',
  github: '/api/auth/oauth/github',
  google: '/api/auth/oauth/google',
} as const
