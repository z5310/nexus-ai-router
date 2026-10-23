import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { FastifyRequest } from 'fastify'
import type { UserRole } from '@gateway/contracts'
import { SessionsRepository } from './sessions.repository'

export interface AuthPrincipal { sub: string; email: string; role: UserRole; sid: string }
export type AuthenticatedRequest = FastifyRequest & { user: AuthPrincipal }

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly sessions: SessionsRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('请先登录')
    let principal: AuthPrincipal
    try {
      principal = await this.jwt.verifyAsync<AuthPrincipal>(token)
    } catch {
      throw new UnauthorizedException('访问令牌已失效')
    }
    if (!principal.sub || !principal.sid) throw new UnauthorizedException('访问令牌已失效')
    const session = await this.sessions.findActiveById(principal.sid, principal.sub)
    if (!session || session.user.status !== 'active') throw new UnauthorizedException('登录会话已失效')
    request.user = {
      sub: session.user.id,
      email: session.user.email,
      role: session.user.role,
      sid: session.id,
    }
    return true
  }
}
