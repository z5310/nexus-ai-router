import { BadGatewayException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
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

export type OauthProvider = 'github' | 'google'

interface OauthProfile {
  email: string
  name: string
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

  async oauthLogin(provider: OauthProvider, code: string): Promise<IssuedAuth> {
    const profile = provider === 'github' ? await this.githubProfile(code) : await this.googleProfile(code)
    let user = await this.users.findByEmail(profile.email)
    if (!user) {
      user = this.users.create({
        email: profile.email.toLowerCase(),
        name: profile.name,
        passwordHash: await this.passwords.hash(randomBytes(32).toString('base64url')),
        role: 'viewer',
        status: 'active',
        lastLoginAt: new Date(),
      })
    } else {
      if (user.status !== 'active') throw new UnauthorizedException('账户暂不可登录，请联系管理员')
      user.lastLoginAt = new Date()
      if (!user.name.trim()) user.name = profile.name
    }
    await this.users.save(user)
    return this.issue(user.id, 30)
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
