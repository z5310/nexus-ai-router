import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AuthResponse, AuthUser } from '@gateway/contracts'
import { AuthService, type IssuedAuth } from './auth.service'
import { JwtAuthGuard, type AuthenticatedRequest } from './auth.guard'
import { LoginDto } from './dto/login.dto'

const cookieName = 'nexus_refresh'

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in with email and password' })
  async login(@Body() input: LoginDto, @Res({ passthrough: true }) reply: FastifyReply): Promise<AuthResponse> {
    return this.respond(await this.auth.login(input), reply)
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
}
