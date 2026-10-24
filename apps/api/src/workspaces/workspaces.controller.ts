import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { UpdateMemberDto } from './update-member.dto'
import { WorkspaceContextGuard, type WorkspaceRequest } from './workspace-context.guard'
import { UpdateWorkspaceDto } from './update-workspace.dto'
import { UpdateIpPolicyDto } from './update-ip-policy.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { WorkspaceListResponse } from '@gateway/contracts'
import { JwtAuthGuard, type AuthenticatedRequest } from '../identity/auth.guard'
import { WorkspacesService } from './workspaces.service'
import { RequireWorkspacePermission } from './workspace-permissions'
import { TransferWorkspaceOwnershipDto } from './workspace-invitation.dto'

@ApiTags('workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Patch('current/members/:id')
  @RequireWorkspacePermission('members:manage')
  @HttpCode(204)
  @UseGuards(WorkspaceContextGuard)
  async updateMember(@Req() request: WorkspaceRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: UpdateMemberDto) {
    await this.workspaces.manageMember(request.user.sub, request.workspace.id, id, input.role)
  }

  @Delete('current/members/:id')
  @RequireWorkspacePermission('members:manage')
  @HttpCode(204)
  @UseGuards(WorkspaceContextGuard)
  async removeMember(@Req() request: WorkspaceRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    await this.workspaces.manageMember(request.user.sub, request.workspace.id, id, null)
  }

  @Post('current/transfer-ownership')
  @RequireWorkspacePermission('workspace:manage')
  @UseGuards(WorkspaceContextGuard)
  transferOwnership(@Req() request: WorkspaceRequest, @Body() input: TransferWorkspaceOwnershipDto) {
    return this.workspaces.transferOwnership(request.user.sub, request.workspace.id, input.memberId)
  }

  @Get('current/ip-policy')
  @RequireWorkspacePermission('ip-policy:read')
  @UseGuards(WorkspaceContextGuard)
  ipPolicy(@Req() request: WorkspaceRequest) { return this.workspaces.ipPolicy(request.workspace.id) }

  @Patch('current/ip-policy')
  @RequireWorkspacePermission('ip-policy:manage')
  @UseGuards(WorkspaceContextGuard)
  updateIpPolicy(@Req() request: WorkspaceRequest, @Body() input: UpdateIpPolicyDto) {
    return this.workspaces.updateIpPolicy(request.user.sub, request.workspace.id, input)
  }

  @Get('current/members')
  @RequireWorkspacePermission('members:read')
  @UseGuards(WorkspaceContextGuard)
  members(@Req() request: WorkspaceRequest) {
    return this.workspaces.listMembers(request.workspace.id)
  }

  @Get('current')
  @RequireWorkspacePermission('workspace:read')
  @UseGuards(WorkspaceContextGuard)
  current(@Req() request: WorkspaceRequest) {
    return request.workspace
  }

  @Patch('current')
  @RequireWorkspacePermission('workspace:manage')
  @UseGuards(WorkspaceContextGuard)
  update(@Req() request: WorkspaceRequest, @Body() input: UpdateWorkspaceDto) {
    return this.workspaces.updateSettings(request.user.sub, request.workspace.id, input)
  }

  @Get()
  @ApiOperation({ summary: 'List workspaces accessible to the current user' })
  list(@Req() request: AuthenticatedRequest): Promise<WorkspaceListResponse> {
    return this.workspaces.list(request.user.sub)
  }
}
