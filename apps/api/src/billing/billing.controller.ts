import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../identity/auth.guard'
import { WorkspaceContextGuard, type WorkspaceRequest } from '../workspaces/workspace-context.guard'
import { RequireWorkspacePermission } from '../workspaces/workspace-permissions'
import { BillingService } from './billing.service'
import { ChatBillingService } from './chat-billing.service'

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceContextGuard)
@RequireWorkspacePermission('usage:read')
@Controller('api/billing')
export class BillingController {
  constructor(private readonly billing: BillingService, private readonly chatBilling: ChatBillingService) {}

  @Get('status')
  status(@Req() request: WorkspaceRequest) { return { chatEnabled: this.chatBilling.enabled(request.workspace.id), currency: 'CNY' } }

  @Get('pending')
  pending(@Req() request: WorkspaceRequest) { return this.chatBilling.pending(request.workspace.id) }

  @Get('balance')
  balance(@Req() request: WorkspaceRequest) { return this.billing.balance(request.workspace.id) }

  @Get('ledger')
  ledger(@Req() request: WorkspaceRequest, @Query('cursor') cursor?: string, @Query('from') from?: string, @Query('to') to?: string) { return this.billing.ledger(request.workspace.id, cursor, from, to) }

  @Get('usage')
  usage(@Req() request: WorkspaceRequest, @Query('from') from?: string, @Query('to') to?: string) { return this.billing.usage(request.workspace.id, from, to) }
}
