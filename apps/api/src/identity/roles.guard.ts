import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { UserRole } from '@gateway/contracts'
import type { AuthenticatedRequest } from './auth.guard'

const ROLES_KEY = 'identity.roles'
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()])
    if (!roles?.length) return true
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    if (!roles.includes(request.user.role)) throw new ForbiddenException('当前账户没有此操作权限')
    return true
  }
}
