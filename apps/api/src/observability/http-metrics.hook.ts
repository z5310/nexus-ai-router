import { Injectable, OnModuleInit } from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { ObservabilityService } from './observability.service'

@Injectable()
export class HttpMetricsHook implements OnModuleInit {
  private readonly startedAt = new WeakMap<FastifyRequest, number>()

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly metrics: ObservabilityService,
  ) {}

  onModuleInit(): void {
    const instance = this.adapterHost.httpAdapter.getInstance<FastifyInstance>()
    instance.addHook('onRequest', (request, reply, done) => {
      this.startedAt.set(request, performance.now())
      reply.header('x-request-id', request.id)
      done()
    })
    instance.addHook('onResponse', (request, reply, done) => {
      const startedAt = this.startedAt.get(request) ?? performance.now()
      this.metrics.recordHttp(
        request.method,
        request.routeOptions?.url ?? 'unmatched',
        reply.statusCode,
        performance.now() - startedAt,
      )
      this.startedAt.delete(request)
      done()
    })
  }
}
