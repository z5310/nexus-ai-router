import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AuthResponse, AuthUser } from '@gateway/contracts'
import { AuthService, type IssuedAuth, type OauthProvider } from './auth.service'
import { JwtAuthGuard, type AuthenticatedRequest } from './auth.guard'
import { LoginDto } from './dto/login.dto'

const cookieName = 'nexus_refresh'
const oauthStateCookie = 'nexus_oauth_state'

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in with email and password' })
  async login(@Body() input: LoginDto, @Res({ passthrough: true }) reply: FastifyReply): Promise<AuthResponse> {
    return this.respond(await this.auth.login(input), reply)
  }

  @Get('oauth/:provider')
  @ApiOperation({ summary: 'Start a GitHub or Google OAuth login' })
  oauthStart(@Param('provider') value: string, @Res() reply: FastifyReply) {
    const provider = this.provider(value)
    try {
      const { state, url } = this.auth.createOauthStart(provider)
      reply.setCookie(oauthStateCookie, state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth/oauth', maxAge: 600 })
      return reply.code(302).redirect(url)
    } catch {
      return reply.code(302).redirect(`${this.webOrigin()}/login?error=oauth_not_configured`)
    }
  }

  @Get('oauth/:provider/callback')
  @ApiOperation({ summary: 'Complete a GitHub or Google OAuth login' })
  async oauthCallback(
    @Param('provider') value: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const provider = this.provider(value)
    if (!code || !state || state !== request.cookies?.[oauthStateCookie]) return reply.code(302).redirect(`${this.webOrigin()}/login?error=oauth_failed`)
    try {
      this.respond(await this.auth.oauthLogin(provider, code), reply)
      reply.clearCookie(oauthStateCookie, { path: '/api/auth/oauth' })
      return reply.code(302).redirect(`${this.webOrigin()}/auth/callback`)
    } catch {
      reply.clearCookie(oauthStateCookie, { path: '/api/auth/oauth' })
      return reply.code(302).redirect(`${this.webOrigin()}/login?error=oauth_failed`)
    }
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate the refresh session and issue a new access token' })
  async refresh(@Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<AuthResponse> {
    return this.respond(await this.auth.refresh(request.cookies?.[cookieName]), reply)
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<void> {
    await this.auth.logout(request.cookies?.[cookieName])
    reply.clearCookie(cookieName, { path: '/api/auth' })
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@Req() request: AuthenticatedRequest): Promise<AuthUser> {
    return this.auth.me(request.user.sub)
  }

  private respond(result: IssuedAuth, reply: FastifyReply): AuthResponse {
    const { refreshToken, refreshExpiresAt, ...response } = result
    reply.setCookie(cookieName, refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth', expires: refreshExpiresAt })
    return response
  }

  private provider(value: string): OauthProvider {
    if (value !== 'github' && value !== 'google') throw new BadRequestException('不支持的第三方登录方式')
    return value
  }

  private webOrigin(): string {
    return this.config.getOrThrow<string>('WEB_ORIGIN').replace(/\/$/, '')
  }
}
