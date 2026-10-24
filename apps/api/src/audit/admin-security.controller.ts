import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { AdminSessionListResponse, AuditLogListResponse } from '@gateway/contracts'
import { JwtAuthGuard, type AuthenticatedRequest } from '../identity/auth.guard'
import { Roles, RolesGuard } from '../identity/roles.guard'
import { AuditService } from './audit.service'
import { AdminSecurityService } from './admin-security.service'
import { ListAdminSessionsQuery, ListAuditLogsQuery } from './dto/admin-security.dto'

@ApiTags('admin-security')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/admin')
export class AdminSecurityController {
  constructor(private readonly audit: AuditService, private readonly security: AdminSecurityService) {}

  @Get('audit-logs')
  @ApiOperation({ summary: 'Search immutable platform audit events' })
  auditLogs(@Query() query: ListAuditLogsQuery): Promise<AuditLogListResponse> { return this.audit.list(query) }

  @Get('sessions')
  @ApiOperation({ summary: 'Search login sessions across platform users' })
  sessions(@Query() query: ListAdminSessionsQuery, @Req() request: AuthenticatedRequest): Promise<AdminSessionListResponse> {
    return this.security.listSessions(query, request.user.sid)
  }

  @Delete('sessions/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke another login session' })
  revokeSession(@Param('id', new ParseUUIDPipe()) id: string, @Req() request: AuthenticatedRequest): Promise<void> {
    return this.security.revokeSession(id, request.user.sid)
  }
}
