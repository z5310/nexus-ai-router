import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ModelEntity } from '../database/entities/model.entity'
import { CatalogModelsController, ModelsController, RankingsController } from './models.controller'
import { ModelsRepository } from './models.repository'
import { ModelsService } from './models.service'

@Module({
  imports: [TypeOrmModule.forFeature([ModelEntity])],
  controllers: [ModelsController, CatalogModelsController, RankingsController],
  providers: [ModelsRepository, ModelsService],
  exports: [ModelsService],
})
export class ModelsModule {}
