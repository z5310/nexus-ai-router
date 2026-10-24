import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { Observable, tap } from 'rxjs'
import type { AuthPrincipal } from '../identity/auth.guard'
import { AuditService } from './audit.service'

type AdminRequest = FastifyRequest & { user?: AuthPrincipal; params?: Record<string, string>; routeOptions?: { url?: string } }

@Injectable()
export class AdminMutationAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AdminMutationAuditInterceptor.name)

  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle()
    const request = context.switchToHttp().getRequest<AdminRequest>()
    const method = request.method.toUpperCase()
    const path = request.routeOptions?.url ?? request.url.split('?')[0]
    if (!request.user || !path.startsWith('/api/admin/') || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next.handle()
    const resourceType = this.resourceType(path)
    const common = {
      actorUserId: request.user.sub,
      actorEmail: request.user.email,
      action: `admin.${method.toLowerCase()}`,
      resourceType,
      resourceId: request.params?.id ?? null,
      ipAddress: request.ip,
      userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
      requestId: request.id,
    }
    return next.handle().pipe(tap({
      next: (response) => { void this.audit.record({ ...common, resourceId: common.resourceId ?? this.responseId(response), outcome: 'success', metadata: { method, path } }).catch((error) => this.logger.error({ err: error, path }, 'Failed to append admin audit event')) },
      error: (error: { status?: number; name?: string }) => { void this.audit.record({ ...common, outcome: 'failure', metadata: { method, path, statusCode: error.status ?? 500, error: error.name ?? 'Error' } }).catch((auditError) => this.logger.error({ err: auditError, path }, 'Failed to append admin audit event')) },
    }))
  }

  private responseId(response: unknown): string | null {
    if (!response || typeof response !== 'object') return null
    const id = 'id' in response ? response.id : 'source' in response && response.source && typeof response.source === 'object' && 'id' in response.source ? response.source.id : null
    return typeof id === 'string' ? id : null
  }

  private resourceType(path: string): string {
    return path.replace('/api/admin/', '').split('/')[0]?.replaceAll('-', '_') || 'admin'
  }
}
