import { Controller, Get, Res } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource } from '@nestjs/typeorm'
import type { FastifyReply } from 'fastify'
import { DataSource } from 'typeorm'
import type { HealthResponse } from '@gateway/contracts'
import { TrafficControlService } from '../traffic-control/traffic-control.service'
import { ObservabilityService } from '../observability/observability.service'

interface ReadinessResponse extends HealthResponse {
  dependencies: Record<string, { status: 'ok' | 'error'; latencyMs: number }>
}

@ApiTags('system')
@Controller('api')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly traffic: TrafficControlService,
    private readonly config: ConfigService,
    private readonly metrics: ObservabilityService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Liveness check' })
  health(): HealthResponse {
    return {
      status: 'ok',
      service: 'model-gateway-api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    }
  }

  @Get('ready')
  @ApiOperation({ summary: 'Bounded readiness check including PostgreSQL and Redis' })
  async ready(@Res({ passthrough: true }) reply: FastifyReply): Promise<ReadinessResponse> {
    const timeoutMs = this.config.get<number>('READINESS_TIMEOUT_MS', 2_000)
    const dependencies = Object.fromEntries(await Promise.all([
      this.check('postgres', () => this.dataSource.query('SELECT 1'), timeoutMs),
      this.check('redis', () => this.traffic.ping(), timeoutMs),
    ]))
    const ready = Object.values(dependencies).every((dependency) => dependency.status === 'ok')
    if (!ready) reply.status(503)
    return { ...this.health(), status: ready ? 'ok' : 'degraded', dependencies }
  }

  private async check(name: string, operation: () => Promise<unknown>, timeoutMs: number): Promise<[string, { status: 'ok' | 'error'; latencyMs: number }]> {
    const startedAt = performance.now()
    let timer: NodeJS.Timeout | undefined
    try {
      await Promise.race([
        operation(),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${name} readiness timeout`)), timeoutMs) }),
      ])
      this.metrics.setDependencyReady(name, true)
      return [name, { status: 'ok', latencyMs: Math.max(0, Math.round(performance.now() - startedAt)) }]
    } catch {
      this.metrics.setDependencyReady(name, false)
      return [name, { status: 'error', latencyMs: Math.max(0, Math.round(performance.now() - startedAt)) }]
    } finally {
      if (timer) clearTimeout(timer)
    }
  }
}
