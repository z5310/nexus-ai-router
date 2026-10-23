import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ModelEntity } from '../database/entities/model.entity'
import { ModelPriceVersionEntity } from '../database/entities/model-price-version.entity'
import { WorkspaceModelEntity } from '../database/entities/workspace-model.entity'
import { CatalogModelsController, ModelsController, RankingsController } from './models.controller'
import { AdminModelsController } from './admin-models.controller'
import { IdentityModule } from '../identity/identity.module'
import { ModelsRepository } from './models.repository'
import { ModelsService } from './models.service'
import { WorkspaceModelsController } from './workspace-models.controller'
import { WorkspaceModelsRepository } from './workspace-models.repository'
import { WorkspaceModelsService } from './workspace-models.service'
import { InferenceModule } from '../inference/inference.module'
import { ModelPricingService } from './model-pricing.service'
import { RankingsModule } from '../rankings/rankings.module'

@Module({
  imports: [TypeOrmModule.forFeature([ModelEntity, ModelPriceVersionEntity, WorkspaceModelEntity]), IdentityModule, InferenceModule, RankingsModule],
  controllers: [ModelsController, CatalogModelsController, RankingsController, AdminModelsController, WorkspaceModelsController],
  providers: [ModelsRepository, ModelsService, ModelPricingService, WorkspaceModelsRepository, WorkspaceModelsService],
  exports: [ModelsService],
})
export class ModelsModule {}
