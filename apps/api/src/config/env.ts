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
  READINESS_TIMEOUT_MS: z.coerce.number().int().min(100).max(30_000).default(2_000),
  METRICS_COLLECTION_TIMEOUT_MS: z.coerce.number().int().min(100).max(10_000).default(1_000),
  METERING_OUTBOX_POLL_MS: z.coerce.number().int().min(1_000).max(60_000).default(5_000),
  METERING_OUTBOX_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(100),
  METERING_OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(100).default(10),
  GLOBAL_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(10).max(1_000_000).default(600),
  LOGIN_RATE_LIMIT_PER_15_MINUTES: z.coerce.number().int().min(3).max(10_000).default(20),
  INFERENCE_MAX_CONCURRENCY_PER_WORKSPACE: z.coerce.number().int().min(1).max(10_000).default(20),
  INFERENCE_CONCURRENCY_LEASE_MS: z.coerce.number().int().min(30_000).max(3_600_000).default(600_000),
  TRAFFIC_CONTROL_KEY_PREFIX: z.string().regex(/^[A-Za-z0-9_.:-]{1,64}$/).default('nexus'),
}).superRefine((environment, context) => {
  if (environment.NODE_ENV !== 'production') return

  // 生产环境必须在 TLS 入口之后运行。这里集中校验三个公开地址，避免登录回调、
  // Cookie 和跨域策略因为某个单独配置遗漏而退回明文 HTTP。
  for (const key of ['WEB_ORIGIN', 'ADMIN_ORIGIN', 'OAUTH_CALLBACK_ORIGIN'] as const) {
    if (new URL(environment[key]).protocol !== 'https:') {
      context.addIssue({ code: 'custom', path: [key], message: '生产环境必须使用 HTTPS 地址' })
    }
  }

  if (environment.PROVIDER_CREDENTIAL_ENV !== 'production') {
    context.addIssue({ code: 'custom', path: ['PROVIDER_CREDENTIAL_ENV'], message: '生产环境只能读取 production 供应商凭证' })
  }
  if (!environment.TRUSTED_PROXY_CIDRS?.trim()) {
    context.addIssue({ code: 'custom', path: ['TRUSTED_PROXY_CIDRS'], message: '生产环境必须显式配置可信代理网段' })
  }
  if (environment.ENCRYPTION_KEY_VERSION === 'local-v1') {
    context.addIssue({ code: 'custom', path: ['ENCRYPTION_KEY_VERSION'], message: '生产环境必须使用独立的加密密钥版本' })
  }

  // 供应商凭证使用 AES-256-GCM；生产环境只接受可解码为 32 字节的 Base64 密钥，
  // 从源头避免把示例文本或低熵口令经 SHA-256 派生后误当作主密钥。
  const decodedKey = Buffer.from(environment.ENCRYPTION_KEY, 'base64')
  const canonicalKey = decodedKey.toString('base64').replace(/=+$/, '')
  if (decodedKey.length !== 32 || canonicalKey !== environment.ENCRYPTION_KEY.replace(/=+$/, '')) {
    context.addIssue({ code: 'custom', path: ['ENCRYPTION_KEY'], message: '生产环境加密密钥必须是 32 字节 Base64' })
  }

  const unsafeMarker = /replace-with|ci-only|development|example/i
  if (unsafeMarker.test(environment.JWT_SECRET)) {
    context.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: '生产环境不能使用示例或 CI 密钥' })
  }
  if (unsafeMarker.test(environment.ENCRYPTION_KEY)) {
    context.addIssue({ code: 'custom', path: ['ENCRYPTION_KEY'], message: '生产环境不能使用示例或 CI 密钥' })
  }
})

export type Environment = z.infer<typeof envSchema>

export function validateEnvironment(config: Record<string, unknown>): Environment {
  const result = envSchema.safeParse(config)
  if (!result.success) {
    throw new Error(`Invalid environment: ${z.prettifyError(result.error)}`)
  }
  return result.data
}
