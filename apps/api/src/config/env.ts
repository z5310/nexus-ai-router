import { z } from 'zod'

const optionalSecret = z.preprocess((value) => value === '' ? undefined : value, z.string().min(1).optional())

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  ADMIN_ORIGIN: z.string().url().default('http://localhost:5174'),
  OAUTH_CALLBACK_ORIGIN: z.string().url().default('http://localhost:3000'),
  GITHUB_CLIENT_ID: optionalSecret,
  GITHUB_CLIENT_SECRET: optionalSecret,
  GOOGLE_CLIENT_ID: optionalSecret,
  GOOGLE_CLIENT_SECRET: optionalSecret,
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().min(32),
  ENCRYPTION_KEY_VERSION: z.string().min(1).max(40).default('local-v1'),
  PROVIDER_CREDENTIAL_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PROVIDER_GATEWAY_URL: z.preprocess((value) => value === '' ? undefined : value, z.string().url().optional()),
  PROVIDER_GATEWAY_API_KEY: optionalSecret,
  PROVIDER_GATEWAY_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(300_000).default(60_000),
})

export type Environment = z.infer<typeof envSchema>

export function validateEnvironment(config: Record<string, unknown>): Environment {
  const result = envSchema.safeParse(config)
  if (!result.success) {
    throw new Error(`Invalid environment: ${z.prettifyError(result.error)}`)
  }
  return result.data
}
