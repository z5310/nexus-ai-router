import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Req, Res, UseGuards } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AuthResponse, AuthSessionListResponse, AuthUser, PasswordResetRequestResponse } from '@gateway/contracts'
import { AuthService, type IssuedAuth, type OauthProvider } from './auth.service'
import { JwtAuthGuard, type AuthenticatedRequest } from './auth.guard'
import { ChangePasswordDto, ForgotPasswordDto, RegisterDto, ResetPasswordDto } from './dto/auth-account.dto'
import { LoginDto } from './dto/login.dto'
import type { SessionMetadata } from './sessions.repository'

const cookieName = 'nexus_refresh'
const oauthStateCookie = 'nexus_oauth_state'

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService) {}

  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a customer account and sign in' })
  async register(@Body() input: RegisterDto, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<AuthResponse> {
    return this.respond(await this.auth.register(input, this.metadata(request)), reply)
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in with email and password' })
  async login(@Body() input: LoginDto, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<AuthResponse> {
    return this.respond(await this.auth.login(input, this.metadata(request)), reply)
  }

  @Post('forgot-password')
  @HttpCode(202)
  @ApiOperation({ summary: 'Request a password reset without revealing account existence' })
  forgotPassword(@Body() input: ForgotPasswordDto): Promise<PasswordResetRequestResponse> {
    return this.auth.requestPasswordReset(input)
  }

  @Post('reset-password')
  @HttpCode(204)
  @ApiOperation({ summary: 'Set a new password using a one-time reset token' })
  resetPassword(@Body() input: ResetPasswordDto): Promise<void> {
    return this.auth.resetPassword(input)
  }

  @Post('change-password')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the current password and revoke every session' })
  async changePassword(@Body() input: ChangePasswordDto, @Req() request: AuthenticatedRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<void> {
    await this.auth.changePassword(request.user.sub, input)
    reply.clearCookie(cookieName, { path: '/api/auth' })
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
      this.respond(await this.auth.oauthLogin(provider, code, this.metadata(request)), reply)
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
    return this.respond(await this.auth.refresh(request.cookies?.[cookieName], this.metadata(request)), reply)
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

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active login sessions' })
  sessions(@Req() request: AuthenticatedRequest): Promise<AuthSessionListResponse> {
    return this.auth.listSessions(request.user.sub, request.user.sid)
  }

  @Delete('sessions/:id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke one login session' })
  async revokeSession(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    await this.auth.revokeSession(request.user.sub, id)
    if (request.user.sid === id) reply.clearCookie(cookieName, { path: '/api/auth' })
  }

  @Delete('sessions')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all login sessions' })
  async revokeAllSessions(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<void> {
    await this.auth.revokeAllSessions(request.user.sub)
    reply.clearCookie(cookieName, { path: '/api/auth' })
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

  private metadata(request: FastifyRequest): SessionMetadata {
    const userAgent = request.headers['user-agent']
    return { ipAddress: request.ip, userAgent: typeof userAgent === 'string' ? userAgent : undefined }
  }
}
