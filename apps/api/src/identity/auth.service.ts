import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { createHash, randomBytes } from 'node:crypto'
import type { AuthResponse } from '@gateway/contracts'
import type { LoginDto } from './dto/login.dto'
import { PasswordService } from './password.service'
import { SessionsRepository } from './sessions.repository'
import { UsersRepository } from './users.repository'
import { UsersService } from './users.service'

export interface IssuedAuth extends AuthResponse {
  refreshToken: string
  refreshExpiresAt: Date
}

@Injectable()
export class AuthService {
  private readonly accessTokenTtl = 15 * 60

  constructor(
    private readonly users: UsersRepository,
    private readonly userService: UsersService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionsRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(input: LoginDto): Promise<IssuedAuth> {
    const user = await this.users.findByEmail(input.email)
    if (!user || !(await this.passwords.verify(input.password, user.passwordHash))) throw new UnauthorizedException('邮箱或密码错误')
    if (user.status !== 'active') throw new UnauthorizedException('账户暂不可登录，请联系管理员')
    user.lastLoginAt = new Date()
    await this.users.save(user)
    return this.issue(user.id, input.remember ? 30 : 7)
  }

  async refresh(refreshToken: string | undefined): Promise<IssuedAuth> {
    if (!refreshToken) throw new UnauthorizedException('登录会话已失效')
    const session = await this.sessions.findActive(this.hashToken(refreshToken))
    if (!session || session.user.status !== 'active') throw new UnauthorizedException('登录会话已失效')
    await this.sessions.revoke(session.tokenHash)
    return this.issue(session.userId, Math.max(1, Math.ceil((session.expiresAt.getTime() - Date.now()) / 86_400_000)))
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) await this.sessions.revoke(this.hashToken(refreshToken))
  }

  async me(userId: string) {
    const user = await this.userService.require(userId)
    if (user.status !== 'active') throw new UnauthorizedException('账户已停用')
    return this.userService.toAuthUser(user)
  }

  private async issue(userId: string, refreshDays: number): Promise<IssuedAuth> {
    const user = await this.userService.require(userId)
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role }, { expiresIn: this.accessTokenTtl })
    const refreshToken = randomBytes(48).toString('base64url')
    const refreshExpiresAt = new Date(Date.now() + refreshDays * 86_400_000)
    await this.sessions.create(user.id, this.hashToken(refreshToken), refreshExpiresAt)
    return { accessToken, expiresIn: this.accessTokenTtl, user: this.userService.toAuthUser(user), refreshToken, refreshExpiresAt }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(`${token}:${this.config.getOrThrow<string>('JWT_SECRET')}`).digest('hex')
  }
}
