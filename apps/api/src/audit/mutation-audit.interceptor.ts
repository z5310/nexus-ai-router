import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { Observable, tap } from 'rxjs'
import type { WorkspaceContext } from '@gateway/contracts'
import type { AuthPrincipal } from '../identity/auth.guard'
import { AuditService } from './audit.service'

type AuditedRequest = FastifyRequest & {
  user?: AuthPrincipal
  workspace?: WorkspaceContext
  params?: Record<string, string>
  routeOptions?: { url?: string }
}

@Injectable()
export class MutationAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MutationAuditInterceptor.name)

  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle()
    const request = context.switchToHttp().getRequest<AuditedRequest>()
    const method = request.method.toUpperCase()
    const path = request.routeOptions?.url ?? request.url.split('?')[0]
    const scope = this.scope(path)
    if (!request.user || !scope || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next.handle()
    const resourceType = this.resourceType(path)
    const common = {
      actorUserId: request.user.sub,
      actorEmail: request.user.email,
      action: `${scope}.${method.toLowerCase()}`,
      resourceType,
      resourceId: request.params?.id ?? null,
      ipAddress: request.ip,
      userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
      requestId: request.id,
    }
    const metadata = { method, path, ...(request.workspace ? { workspaceId: request.workspace.id } : {}) }
    return next.handle().pipe(tap({
      next: (response) => { void this.audit.record({ ...common, resourceId: common.resourceId ?? this.responseId(response), outcome: 'success', metadata }).catch((error) => this.logger.error({ err: error, path }, 'Failed to append mutation audit event')) },
      error: (error: { status?: number; name?: string }) => { void this.audit.record({ ...common, outcome: 'failure', metadata: { ...metadata, statusCode: error.status ?? 500, error: error.name ?? 'Error' } }).catch((auditError) => this.logger.error({ err: auditError, path }, 'Failed to append mutation audit event')) },
    }))
  }

  private scope(path: string): 'admin' | 'workspace' | null {
    if (path.startsWith('/api/admin/')) return 'admin'
    if (path.startsWith('/api/workspaces/') || path.startsWith('/api/workspace-invitations/') || path === '/api/keys' || path.startsWith('/api/keys/') || path.startsWith('/api/console/routes')) return 'workspace'
    return null
  }

  private responseId(response: unknown): string | null {
    if (!response || typeof response !== 'object') return null
    const id = 'id' in response ? response.id
      : 'workspaceId' in response ? response.workspaceId
        : 'source' in response && response.source && typeof response.source === 'object' && 'id' in response.source ? response.source.id
          : null
    return typeof id === 'string' ? id : null
  }

  private resourceType(path: string): string {
    if (path.startsWith('/api/admin/')) return path.replace('/api/admin/', '').split('/')[0]?.replaceAll('-', '_') || 'admin'
    if (path.startsWith('/api/workspace-invitations/')) return 'workspace_invitation'
    if (path.startsWith('/api/keys')) return 'api_key'
    if (path.startsWith('/api/console/routes')) return 'route_rule'
    if (path.includes('/invitations')) return 'workspace_invitation'
    if (path.includes('/members')) return 'workspace_member'
    if (path.includes('/transfer-ownership')) return 'workspace_ownership'
    if (path.includes('/ip-policy')) return 'workspace_ip_policy'
    return 'workspace'
  }
}
