import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Req, UseGuards } from '@nestjs/common'
import { UpdateMemberDto } from './update-member.dto'
import { WorkspaceContextGuard, type WorkspaceRequest } from './workspace-context.guard'
import { UpdateWorkspaceDto } from './update-workspace.dto'
import { UpdateIpPolicyDto } from './update-ip-policy.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { WorkspaceListResponse } from '@gateway/contracts'
import { JwtAuthGuard, type AuthenticatedRequest } from '../identity/auth.guard'
import { WorkspacesService } from './workspaces.service'

@ApiTags('workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Patch('current/members/:id')
  @HttpCode(204)
  @UseGuards(WorkspaceContextGuard)
  async updateMember(@Req() request: WorkspaceRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: UpdateMemberDto) {
    await this.workspaces.manageMember(request.user.sub, request.workspace.id, id, input.role)
  }

  @Delete('current/members/:id')
  @HttpCode(204)
  @UseGuards(WorkspaceContextGuard)
  async removeMember(@Req() request: WorkspaceRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    await this.workspaces.manageMember(request.user.sub, request.workspace.id, id, null)
  }

  @Get('current/ip-policy')
  @UseGuards(WorkspaceContextGuard)
  ipPolicy(@Req() request: WorkspaceRequest) { return this.workspaces.ipPolicy(request.workspace.id) }

  @Patch('current/ip-policy')
  @UseGuards(WorkspaceContextGuard)
  updateIpPolicy(@Req() request: WorkspaceRequest, @Body() input: UpdateIpPolicyDto) {
    return this.workspaces.updateIpPolicy(request.user.sub, request.workspace.id, input)
  }

  @Get('current/members')
  @UseGuards(WorkspaceContextGuard)
  members(@Req() request: WorkspaceRequest) {
    return this.workspaces.listMembers(request.workspace.id)
  }

  @Get('current')
  @UseGuards(WorkspaceContextGuard)
  current(@Req() request: WorkspaceRequest) {
    return request.workspace
  }

  @Patch('current')
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
