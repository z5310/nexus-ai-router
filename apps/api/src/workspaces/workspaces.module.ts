import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProjectEntity } from '../database/entities/project.entity'
import { WorkspaceMemberEntity } from '../database/entities/workspace-member.entity'
import { WorkspaceEntity } from '../database/entities/workspace.entity'
import { WorkspaceInvitationEntity } from '../database/entities/workspace-invitation.entity'
import { WorkspaceContextGuard } from './workspace-context.guard'
import { WorkspaceInvitationsService } from './workspace-invitations.service'
import { WorkspacesService } from './workspaces.service'

@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceEntity, WorkspaceMemberEntity, WorkspaceInvitationEntity, ProjectEntity])],
  providers: [WorkspacesService, WorkspaceInvitationsService, WorkspaceContextGuard],
  exports: [WorkspacesService, WorkspaceInvitationsService, WorkspaceContextGuard],
})
export class WorkspacesModule {}
