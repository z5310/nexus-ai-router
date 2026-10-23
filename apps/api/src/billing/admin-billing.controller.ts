import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard, type AuthenticatedRequest } from '../identity/auth.guard'
import { Roles, RolesGuard } from '../identity/roles.guard'
import { BillingService } from './billing.service'
import { AdminBillingService } from './admin-billing.service'
import { AdminBillingGrantDto, AdminBillingListQuery, AdminBillingResolutionDto, BillingPreviewDto } from './admin-billing.dto'

@ApiTags('admin-billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/admin/billing')
export class AdminBillingController {
  constructor(private readonly billing: BillingService, private readonly admin: AdminBillingService) {}

  @Get('workspaces')
  workspaces(@Query() query: AdminBillingListQuery) { return this.admin.workspaces(query.query, query.page) }

  @Get(':workspaceId')
  detail(@Param('workspaceId', ParseUUIDPipe) id: string) { return this.admin.detail(id) }

  @Get(':workspaceId/ledger')
  ledger(@Param('workspaceId', ParseUUIDPipe) id: string, @Query('cursor') cursor?: string) { return this.billing.ledger(id, cursor) }

  @Post(':workspaceId/grants')
  grant(@Req() request: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Body() input: AdminBillingGrantDto) {
    return this.billing.adminGrant(id, request.user.sub, input)
  }

  @Post(':workspaceId/reservations/:reference/preview')
  preview(@Param('workspaceId', ParseUUIDPipe) id: string, @Param('reference') reference: string, @Body() input: BillingPreviewDto) {
    return this.billing.previewResolution(id, reference, input)
  }

  @Post(':workspaceId/reservations/:reference/resolve')
  resolve(@Req() request: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Param('reference') reference: string, @Body() input: AdminBillingResolutionDto) {
    return this.billing.adminResolve(id, request.user.sub, reference, input)
  }
}
