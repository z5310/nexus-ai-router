import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHash } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { DistributedLimitException } from './distributed-limit.exception'
import { TrafficControlService } from './traffic-control.service'

@Injectable()
export class GlobalRateLimitGuard implements CanActivate {
  private readonly globalLimit: number
  private readonly loginLimit: number

  constructor(
    private readonly traffic: TrafficControlService,
    config: ConfigService,
  ) {
    this.globalLimit = config.get<number>('GLOBAL_RATE_LIMIT_PER_MINUTE', 600)
    this.loginLimit = config.get<number>('LOGIN_RATE_LIMIT_PER_15_MINUTES', 20)
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp()
    const request = http.getRequest<FastifyRequest>()
    const reply = http.getResponse<FastifyReply>()
    const path = request.url.split('?')[0]
    if (path === '/api/health' || path === '/api/ready' || path.startsWith('/docs')) return true

    try {
      const global = await this.traffic.consume('global-ip', request.ip, this.globalLimit, 60_000)
      reply.header('x-ratelimit-limit', global.limit)
      reply.header('x-ratelimit-remaining', global.remaining)
      if (request.method === 'POST' && path === '/api/auth/login') {
        await this.traffic.consume('login-ip', request.ip, this.loginLimit, 15 * 60_000)
        const email = this.loginEmail(request.body)
        if (email) await this.traffic.consume('login-account', this.hash(email), this.loginLimit, 15 * 60_000)
      }
      return true
    } catch (error) {
      if (error instanceof DistributedLimitException) reply.header('retry-after', error.retryAfterSeconds)
      throw error
    }
  }

  private loginEmail(body: unknown): string | null {
    if (!body || typeof body !== 'object' || !('email' in body) || typeof body.email !== 'string') return null
    return body.email.trim().toLowerCase()
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }
}
