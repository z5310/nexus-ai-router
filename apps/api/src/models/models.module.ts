import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ModelEntity } from '../database/entities/model.entity'
import { WorkspaceModelEntity } from '../database/entities/workspace-model.entity'
import { CatalogModelsController, ModelsController, RankingsController } from './models.controller'
import { AdminModelsController } from './admin-models.controller'
import { IdentityModule } from '../identity/identity.module'
import { ModelsRepository } from './models.repository'
import { ModelsService } from './models.service'
import { WorkspaceModelsController } from './workspace-models.controller'
import { WorkspaceModelsRepository } from './workspace-models.repository'
import { WorkspaceModelsService } from './workspace-models.service'

@Module({
  imports: [TypeOrmModule.forFeature([ModelEntity, WorkspaceModelEntity]), IdentityModule],
  controllers: [ModelsController, CatalogModelsController, RankingsController, AdminModelsController, WorkspaceModelsController],
  providers: [ModelsRepository, ModelsService, WorkspaceModelsRepository, WorkspaceModelsService],
  exports: [ModelsService],
})
export class ModelsModule {}
