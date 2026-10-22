import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProjectEntity } from '../database/entities/project.entity'
import { WorkspaceMemberEntity } from '../database/entities/workspace-member.entity'
import { WorkspaceEntity } from '../database/entities/workspace.entity'
import { WorkspaceContextGuard } from './workspace-context.guard'
import { WorkspacesService } from './workspaces.service'

@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceEntity, WorkspaceMemberEntity, ProjectEntity])],
  providers: [WorkspacesService, WorkspaceContextGuard],
  exports: [WorkspacesService, WorkspaceContextGuard],
})
export class WorkspacesModule {}
