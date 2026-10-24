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
  PROVIDER_OUTBOUND_HOSTS: z.string().default(''),
  AUDIO_GENERATION_GATEWAY_URL: z.preprocess((value) => value === '' ? undefined : value, z.string().url().optional()),
  AUDIO_GENERATION_TIMEOUT_MS: z.coerce.number().int().min(10_000).max(900_000).default(300_000),
  BILLING_PREPAID_WORKSPACE_IDS: z.string().default('').refine((value) => value.trim() === '' || value.split(',').every((id) => z.string().uuid().safeParse(id.trim()).success), '计费工作区必须为逗号分隔的 UUID'),
  TRUSTED_PROXY_CIDRS: z.string().optional(),
  REQUEST_BODY_LIMIT_BYTES: z.coerce.number().int().min(16_384).max(10_485_760).default(1_048_576),
  GLOBAL_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(10).max(1_000_000).default(600),
  LOGIN_RATE_LIMIT_PER_15_MINUTES: z.coerce.number().int().min(3).max(10_000).default(20),
  INFERENCE_MAX_CONCURRENCY_PER_WORKSPACE: z.coerce.number().int().min(1).max(10_000).default(20),
  INFERENCE_CONCURRENCY_LEASE_MS: z.coerce.number().int().min(30_000).max(3_600_000).default(600_000),
  TRAFFIC_CONTROL_KEY_PREFIX: z.string().regex(/^[A-Za-z0-9_.:-]{1,64}$/).default('nexus'),
})

export type Environment = z.infer<typeof envSchema>

export function validateEnvironment(config: Record<string, unknown>): Environment {
  const result = envSchema.safeParse(config)
  if (!result.success) {
    throw new Error(`Invalid environment: ${z.prettifyError(result.error)}`)
  }
  return result.data
}
