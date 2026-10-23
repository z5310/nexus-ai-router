import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { WorkspaceContext } from '@gateway/contracts'
import type { AuthenticatedRequest } from '../identity/auth.guard'
import { WorkspacesService } from './workspaces.service'
import { hasWorkspacePermissions, WORKSPACE_PERMISSIONS_KEY, type WorkspacePermission } from './workspace-permissions'

export type WorkspaceRequest = AuthenticatedRequest & { workspace: WorkspaceContext }

@Injectable()
export class WorkspaceContextGuard implements CanActivate {
  constructor(
    private readonly workspaces: WorkspacesService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<WorkspaceRequest>()
    const header = request.headers['x-workspace-id']
    const requestedWorkspaceId = Array.isArray(header) ? header[0] : header
    request.workspace = await this.workspaces.resolve(request.user.sub, requestedWorkspaceId)
    const permissions = this.reflector.getAllAndOverride<WorkspacePermission[]>(WORKSPACE_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? []
    if (!hasWorkspacePermissions(request.workspace.role, permissions)) throw new ForbiddenException('当前工作区角色无权执行此操作')
    return true
  }
}
