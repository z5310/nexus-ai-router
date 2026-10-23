import { Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'
import { randomUUID } from 'node:crypto'
import { DistributedLimitException } from './distributed-limit.exception'

const consumeScript = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
return {current, ttl}
`

const acquireScript = `
local now = tonumber(ARGV[1])
local lease = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now)
local current = redis.call('ZCARD', KEYS[1])
if current >= limit then
  local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
  local retry = 1
  if oldest[2] then retry = math.max(1, math.ceil((tonumber(oldest[2]) - now) / 1000)) end
  return {0, current, retry}
end
redis.call('ZADD', KEYS[1], now + lease, ARGV[4])
redis.call('PEXPIRE', KEYS[1], lease)
return {1, current + 1, 0}
`

const extendScript = `
if redis.call('ZSCORE', KEYS[1], ARGV[1]) then
  redis.call('ZADD', KEYS[1], 'XX', ARGV[2], ARGV[1])
  redis.call('PEXPIRE', KEYS[1], ARGV[3])
  return 1
end
return 0
`

export interface RateLimitState {
  limit: number
  remaining: number
  retryAfterSeconds: number
}

export interface TrafficLease {
  release(): Promise<void>
}

@Injectable()
export class TrafficControlService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TrafficControlService.name)
  private readonly redis: Redis
  private readonly prefix: string

  constructor(private readonly config: ConfigService) {
    this.prefix = config.get<string>('TRAFFIC_CONTROL_KEY_PREFIX', 'nexus')
    this.redis = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    })
    this.redis.on('error', (error) => this.logger.warn(`Redis traffic control error: ${error.message}`))
  }

  async onModuleInit(): Promise<void> {
    await this.redis.connect()
    await this.redis.ping()
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status === 'end') return
    try { await this.redis.quit() } catch { this.redis.disconnect() }
  }

  async ping(): Promise<void> {
    await this.execute(() => this.redis.ping())
  }

  async consume(scope: string, subject: string, limit: number, windowMs: number): Promise<RateLimitState> {
    const result = await this.execute(() => this.redis.eval(
      consumeScript,
      1,
      this.key('rate', scope, subject),
      windowMs,
    )) as [number, number]
    const current = Number(result[0])
    const retryAfterSeconds = Math.max(1, Math.ceil(Number(result[1]) / 1000))
    if (current > limit) throw new DistributedLimitException('请求过于频繁，请稍后重试', retryAfterSeconds)
    return { limit, remaining: Math.max(0, limit - current), retryAfterSeconds }
  }

  async acquireConcurrency(scope: string, subject: string, limit: number, leaseMs: number): Promise<TrafficLease> {
    const key = this.key('concurrency', scope, subject)
    const token = randomUUID()
    const result = await this.execute(() => this.redis.eval(
      acquireScript,
      1,
      key,
      Date.now(),
      leaseMs,
      limit,
      token,
    )) as [number, number, number]
    if (Number(result[0]) !== 1) {
      throw new DistributedLimitException('当前工作区模型调用并发已达上限', Number(result[2]))
    }

    let released = false
    const heartbeat = setInterval(() => {
      void this.extendLease(key, token, leaseMs).catch((error: unknown) => {
        this.logger.warn(`Failed to extend inference concurrency lease: ${error instanceof Error ? error.message : String(error)}`)
      })
    }, Math.max(1_000, Math.floor(leaseMs / 3)))
    heartbeat.unref()

    return {
      release: async () => {
        if (released) return
        released = true
        clearInterval(heartbeat)
        try { await this.execute(() => this.redis.zrem(key, token)) } catch (error) {
          this.logger.warn(`Failed to release inference concurrency lease: ${error instanceof Error ? error.message : String(error)}`)
        }
      },
    }
  }

  private async extendLease(key: string, token: string, leaseMs: number): Promise<void> {
    await this.execute(() => this.redis.eval(extendScript, 1, key, token, Date.now() + leaseMs, leaseMs))
  }

  private key(kind: string, scope: string, subject: string): string {
    return `${this.prefix}:${kind}:${scope}:${subject}`
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (error instanceof DistributedLimitException) throw error
      this.logger.error(`Redis traffic control operation failed: ${error instanceof Error ? error.message : String(error)}`)
      throw new ServiceUnavailableException('流量治理服务暂不可用')
    }
  }
}
