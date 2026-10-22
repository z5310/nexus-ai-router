import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { createHash, randomBytes } from 'node:crypto'
import type { AuthResponse, AuthSessionListResponse, PasswordResetRequestResponse } from '@gateway/contracts'
import type { ChangePasswordDto, ForgotPasswordDto, RegisterDto, ResetPasswordDto } from './dto/auth-account.dto'
import type { LoginDto } from './dto/login.dto'
import { ActionTokensRepository } from './action-tokens.repository'
import { PasswordService } from './password.service'
import { SessionsRepository, type SessionMetadata } from './sessions.repository'
import { UsersRepository } from './users.repository'
import { UsersService } from './users.service'

export interface IssuedAuth extends AuthResponse {
  refreshToken: string
  refreshExpiresAt: Date
}

export type OauthProvider = 'github' | 'google'

interface OauthProfile {
  email: string
  name: string
}

@Injectable()
export class AuthService {
  private readonly accessTokenTtl = 15 * 60
  private readonly passwordResetTtl = 15 * 60
  private readonly maxLoginFailures = 5
  private readonly lockMinutes = 15

  constructor(
    private readonly users: UsersRepository,
    private readonly userService: UsersService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionsRepository,
    private readonly actionTokens: ActionTokensRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(input: RegisterDto, metadata: SessionMetadata): Promise<IssuedAuth> {
    const email = input.email.trim().toLowerCase()
    if (await this.users.findByEmail(email)) throw new ConflictException('该邮箱已被使用')
    const user = this.users.create({
      name: input.name.trim(),
      email,
      passwordHash: await this.passwords.hash(input.password),
      passwordChangedAt: new Date(),
      role: 'viewer',
      status: 'active',
      lastLoginAt: new Date(),
    })
    await this.users.save(user)
    return this.issue(user.id, input.remember ? 30 : 7, metadata)
  }

  async login(input: LoginDto, metadata: SessionMetadata): Promise<IssuedAuth> {
    const user = await this.users.findByEmail(input.email)
    if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) throw new HttpException('登录尝试次数过多，请稍后再试', HttpStatus.TOO_MANY_REQUESTS)
    const valid = user ? await this.passwords.verify(input.password, user.passwordHash) : false
    if (!user || !valid) {
      if (user) await this.recordLoginFailure(user)
      throw new UnauthorizedException('邮箱或密码错误')
    }
    if (user.status !== 'active') throw new UnauthorizedException('账户暂不可登录，请联系管理员')
    user.failedLoginCount = 0
    user.lockedUntil = null
    user.lastLoginAt = new Date()
    await this.users.save(user)
    return this.issue(user.id, input.remember ? 30 : 7, metadata)
  }

  async requestPasswordReset(input: ForgotPasswordDto): Promise<PasswordResetRequestResponse> {
    const token = randomBytes(48).toString('base64url')
    const user = await this.users.findByEmail(input.email)
    if (user?.status === 'active') {
      await this.actionTokens.invalidate(user.id, 'password_reset')
      await this.actionTokens.create(user.id, 'password_reset', this.hashToken(token), new Date(Date.now() + this.passwordResetTtl * 1000))
    }
    const response: PasswordResetRequestResponse = { accepted: true, expiresIn: this.passwordResetTtl }
    if (user?.status === 'active' && this.config.get<string>('NODE_ENV') !== 'production') response.debugToken = token
    return response
  }

  async resetPassword(input: ResetPasswordDto): Promise<void> {
    const action = await this.actionTokens.findActive(this.hashToken(input.token), 'password_reset')
    if (!action || action.user.status !== 'active') throw new BadRequestException('重置链接无效或已过期')
    action.user.passwordHash = await this.passwords.hash(input.password)
    action.user.passwordChangedAt = new Date()
    action.user.failedLoginCount = 0
    action.user.lockedUntil = null
    await this.users.save(action.user)
    await this.actionTokens.consume(action.id)
    await this.sessions.revokeAll(action.userId)
  }

  async changePassword(userId: string, input: ChangePasswordDto): Promise<void> {
    const user = await this.userService.require(userId)
    if (!(await this.passwords.verify(input.currentPassword, user.passwordHash))) throw new UnauthorizedException('当前密码不正确')
    if (await this.passwords.verify(input.password, user.passwordHash)) throw new BadRequestException('新密码不能与当前密码相同')
    user.passwordHash = await this.passwords.hash(input.password)
    user.passwordChangedAt = new Date()
    user.failedLoginCount = 0
    user.lockedUntil = null
    await this.users.save(user)
    await this.sessions.revokeAll(user.id)
  }

  async listSessions(userId: string, currentSessionId: string): Promise<AuthSessionListResponse> {
    const sessions = await this.sessions.listActive(userId)
    return {
      data: sessions.map((session) => ({
        id: session.id,
        current: session.id === currentSessionId,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        lastSeenAt: session.lastSeenAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      })),
    }
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    if (!(await this.sessions.revokeById(userId, sessionId))) throw new NotFoundException('登录会话不存在')
  }

  revokeAllSessions(userId: string): Promise<void> {
    return this.sessions.revokeAll(userId)
  }

  createOauthStart(provider: OauthProvider): { state: string; url: string } {
    const { clientId, callbackUrl } = this.oauthConfig(provider)
    const state = randomBytes(24).toString('base64url')
    const parameters = new URLSearchParams({ client_id: clientId, redirect_uri: callbackUrl, state })
    if (provider === 'github') {
      parameters.set('scope', 'read:user user:email')
      return { state, url: `https://github.com/login/oauth/authorize?${parameters}` }
    }
    parameters.set('response_type', 'code')
    parameters.set('scope', 'openid email profile')
    parameters.set('prompt', 'select_account')
    return { state, url: `https://accounts.google.com/o/oauth2/v2/auth?${parameters}` }
  }

  async oauthLogin(provider: OauthProvider, code: string, metadata: SessionMetadata): Promise<IssuedAuth> {
    const profile = provider === 'github' ? await this.githubProfile(code) : await this.googleProfile(code)
    let user = await this.users.findByEmail(profile.email)
    if (!user) {
      user = this.users.create({
        email: profile.email.toLowerCase(),
        name: profile.name,
        passwordHash: await this.passwords.hash(randomBytes(32).toString('base64url')),
        passwordChangedAt: new Date(),
        role: 'viewer',
        status: 'active',
        lastLoginAt: new Date(),
      })
    } else {
      if (user.status !== 'active') throw new UnauthorizedException('账户暂不可登录，请联系管理员')
      user.lastLoginAt = new Date()
      user.failedLoginCount = 0
      user.lockedUntil = null
      if (!user.name.trim()) user.name = profile.name
    }
    await this.users.save(user)
    return this.issue(user.id, 30, metadata)
  }

  async refresh(refreshToken: string | undefined, metadata: SessionMetadata): Promise<IssuedAuth> {
    if (!refreshToken) throw new UnauthorizedException('登录会话已失效')
    const session = await this.sessions.findActive(this.hashToken(refreshToken))
    if (!session || session.user.status !== 'active') throw new UnauthorizedException('登录会话已失效')
    await this.sessions.revoke(session.tokenHash)
    return this.issue(
      session.userId,
      Math.max(1, Math.ceil((session.expiresAt.getTime() - Date.now()) / 86_400_000)),
      { userAgent: metadata.userAgent ?? session.userAgent ?? undefined, ipAddress: metadata.ipAddress ?? session.ipAddress ?? undefined },
    )
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) await this.sessions.revoke(this.hashToken(refreshToken))
  }

  async me(userId: string) {
    const user = await this.userService.require(userId)
    if (user.status !== 'active') throw new UnauthorizedException('账户已停用')
    return this.userService.toAuthUser(user)
  }

  private async issue(userId: string, refreshDays: number, metadata: SessionMetadata): Promise<IssuedAuth> {
    const user = await this.userService.require(userId)
    const refreshToken = randomBytes(48).toString('base64url')
    const refreshExpiresAt = new Date(Date.now() + refreshDays * 86_400_000)
    const session = await this.sessions.create(user.id, this.hashToken(refreshToken), refreshExpiresAt, metadata)
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role, sid: session.id }, { expiresIn: this.accessTokenTtl })
    return { accessToken, expiresIn: this.accessTokenTtl, user: this.userService.toAuthUser(user), refreshToken, refreshExpiresAt }
  }

  private async recordLoginFailure(user: NonNullable<Awaited<ReturnType<UsersRepository['findByEmail']>>>): Promise<void> {
    const now = Date.now()
    if (user.lockedUntil && user.lockedUntil.getTime() <= now) user.failedLoginCount = 0
    user.failedLoginCount += 1
    if (user.failedLoginCount >= this.maxLoginFailures) {
      user.lockedUntil = new Date(now + this.lockMinutes * 60_000)
      user.failedLoginCount = 0
    }
    await this.users.save(user)
  }

  private oauthConfig(provider: OauthProvider): { callbackUrl: string; clientId: string; clientSecret: string } {
    const prefix = provider.toUpperCase()
    const clientId = this.config.get<string>(`${prefix}_CLIENT_ID`)
    const clientSecret = this.config.get<string>(`${prefix}_CLIENT_SECRET`)
    if (!clientId || !clientSecret) throw new ServiceUnavailableException(`${provider === 'github' ? 'GitHub' : 'Google'} 登录尚未配置`)
    const origin = this.config.getOrThrow<string>('OAUTH_CALLBACK_ORIGIN').replace(/\/$/, '')
    return { clientId, clientSecret, callbackUrl: `${origin}/api/auth/oauth/${provider}/callback` }
  }

  private async githubProfile(code: string): Promise<OauthProfile> {
    const config = this.oauthConfig('github')
    const token = await this.fetchJson<{ access_token?: string; error_description?: string }>('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret, code, redirect_uri: config.callbackUrl }),
    })
    if (!token.access_token) throw new UnauthorizedException(token.error_description ?? 'GitHub 授权失败')
    const headers = { accept: 'application/vnd.github+json', authorization: `Bearer ${token.access_token}`, 'user-agent': 'nexus-ai-router' }
    const [profile, emails] = await Promise.all([
      this.fetchJson<{ email: string | null; login: string; name: string | null }>('https://api.github.com/user', { headers }),
      this.fetchJson<Array<{ email: string; primary: boolean; verified: boolean }>>('https://api.github.com/user/emails', { headers }),
    ])
    const email = profile.email ?? emails.find((item) => item.primary && item.verified)?.email ?? emails.find((item) => item.verified)?.email
    if (!email) throw new UnauthorizedException('GitHub 账户没有已验证的邮箱')
    return { email, name: profile.name?.trim() || profile.login }
  }

  private async googleProfile(code: string): Promise<OauthProfile> {
    const config = this.oauthConfig('google')
    const token = await this.fetchJson<{ access_token?: string; error_description?: string }>('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, code, redirect_uri: config.callbackUrl, grant_type: 'authorization_code' }),
    })
    if (!token.access_token) throw new UnauthorizedException(token.error_description ?? 'Google 授权失败')
    const profile = await this.fetchJson<{ email: string; email_verified: boolean; name?: string }>('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${token.access_token}` },
    })
    if (!profile.email || !profile.email_verified) throw new UnauthorizedException('Google 账户邮箱尚未验证')
    return { email: profile.email, name: profile.name?.trim() || profile.email.split('@')[0] }
  }

  private async fetchJson<T>(url: string, init: RequestInit): Promise<T> {
    const response = await fetch(url, init)
    if (!response.ok) throw new BadGatewayException(`第三方授权服务响应异常 (${response.status})`)
    return response.json() as Promise<T>
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(`${token}:${this.config.getOrThrow<string>('JWT_SECRET')}`).digest('hex')
  }
}
