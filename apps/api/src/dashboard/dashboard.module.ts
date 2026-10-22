import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RequestLogEntity } from '../database/entities/request-log.entity'
import { UsageBucketEntity } from '../database/entities/usage-bucket.entity'
import { DashboardController } from './dashboard.controller'
import { DashboardRepository } from './dashboard.repository'
import { DashboardService } from './dashboard.service'
import { IdentityModule } from '../identity/identity.module'

@Module({
  imports: [TypeOrmModule.forFeature([UsageBucketEntity, RequestLogEntity]), IdentityModule],
  controllers: [DashboardController],
  providers: [DashboardRepository, DashboardService],
})
export class DashboardModule {}
