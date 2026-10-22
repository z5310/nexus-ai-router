import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import type { WorkspaceContext } from '@gateway/contracts'
import type { AuthenticatedRequest } from '../identity/auth.guard'
import { WorkspacesService } from './workspaces.service'

export type WorkspaceRequest = AuthenticatedRequest & { workspace: WorkspaceContext }

@Injectable()
export class WorkspaceContextGuard implements CanActivate {
  constructor(private readonly workspaces: WorkspacesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<WorkspaceRequest>()
    const header = request.headers['x-workspace-id']
    const requestedWorkspaceId = Array.isArray(header) ? header[0] : header
    request.workspace = await this.workspaces.resolve(request.user.sub, requestedWorkspaceId)
    return true
  }
}
