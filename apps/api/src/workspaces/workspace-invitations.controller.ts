import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { AuthenticatedRequest } from '../identity/auth.guard'
import { JwtAuthGuard } from '../identity/auth.guard'
import { RequireWorkspacePermission } from './workspace-permissions'
import { WorkspaceContextGuard, type WorkspaceRequest } from './workspace-context.guard'
import { AcceptWorkspaceInvitationDto, CreateWorkspaceInvitationDto } from './workspace-invitation.dto'
import { WorkspaceInvitationsService } from './workspace-invitations.service'

@ApiTags('workspace invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api')
export class WorkspaceInvitationsController {
  constructor(private readonly invitations: WorkspaceInvitationsService) {}

  @Get('workspaces/current/invitations')
  @RequireWorkspacePermission('members:manage')
  @UseGuards(WorkspaceContextGuard)
  list(@Req() request: WorkspaceRequest) {
    return this.invitations.list(request.workspace.id)
  }

  @Post('workspaces/current/invitations')
  @ApiOperation({ summary: 'Create a one-time workspace invitation valid for seven days' })
  @RequireWorkspacePermission('members:manage')
  @UseGuards(WorkspaceContextGuard)
  create(@Req() request: WorkspaceRequest, @Body() input: CreateWorkspaceInvitationDto) {
    return this.invitations.create(request.user.sub, request.workspace.id, input)
  }

  @Post('workspaces/current/invitations/:id/resend')
  @RequireWorkspacePermission('members:manage')
  @UseGuards(WorkspaceContextGuard)
  resend(@Req() request: WorkspaceRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.invitations.resend(request.user.sub, request.workspace.id, id)
  }

  @Delete('workspaces/current/invitations/:id')
  @HttpCode(204)
  @RequireWorkspacePermission('members:manage')
  @UseGuards(WorkspaceContextGuard)
  async revoke(@Req() request: WorkspaceRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    await this.invitations.revoke(request.user.sub, request.workspace.id, id)
  }

  @Post('workspace-invitations/accept')
  accept(@Req() request: AuthenticatedRequest, @Body() input: AcceptWorkspaceInvitationDto) {
    return this.invitations.accept(request.user.sub, request.user.email, input.token)
  }
}
