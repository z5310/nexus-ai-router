import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { FastifyRequest } from 'fastify'
import type { UserRole } from '@gateway/contracts'

export interface AuthPrincipal { sub: string; email: string; role: UserRole; sid: string }
export type AuthenticatedRequest = FastifyRequest & { user: AuthPrincipal }

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('请先登录')
    try {
      request.user = await this.jwt.verifyAsync<AuthPrincipal>(token)
      return true
    } catch {
      throw new UnauthorizedException('访问令牌已失效')
    }
  }
}
