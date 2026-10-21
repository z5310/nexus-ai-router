import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ModelEntity } from '../database/entities/model.entity'
import { CatalogModelsController, ModelsController, RankingsController } from './models.controller'
import { AdminModelsController } from './admin-models.controller'
import { IdentityModule } from '../identity/identity.module'
import { ModelsRepository } from './models.repository'
import { ModelsService } from './models.service'

@Module({
  imports: [TypeOrmModule.forFeature([ModelEntity]), IdentityModule],
  controllers: [ModelsController, CatalogModelsController, RankingsController, AdminModelsController],
  providers: [ModelsRepository, ModelsService],
  exports: [ModelsService],
})
export class ModelsModule {}
