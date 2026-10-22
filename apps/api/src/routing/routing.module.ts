import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RouteRuleEntity } from '../database/entities/route-rule.entity'
import { WorkspaceModelEntity } from '../database/entities/workspace-model.entity'
import { IdentityModule } from '../identity/identity.module'
import { WorkspaceModelsRepository } from '../models/workspace-models.repository'
import { RouteRulesController } from './route-rules.controller'
import { RouteRulesRepository } from './route-rules.repository'
import { RouteRulesService } from './route-rules.service'

@Module({
  imports: [TypeOrmModule.forFeature([RouteRuleEntity, WorkspaceModelEntity]), IdentityModule],
  controllers: [RouteRulesController],
  providers: [RouteRulesRepository, RouteRulesService, WorkspaceModelsRepository],
})
export class RoutingModule {}
