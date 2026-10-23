import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BenchmarkSnapshotEntity } from '../database/entities/benchmark-snapshot.entity'
import { ModelBenchmarkMappingEntity } from '../database/entities/model-benchmark-mapping.entity'
import { ModelEntity } from '../database/entities/model.entity'
import { RankingSourceEntity } from '../database/entities/ranking-source.entity'
import { IdentityModule } from '../identity/identity.module'
import { HuggingFaceLeaderboardClient } from './hugging-face-leaderboard.client'
import { RankingSourcesController } from './ranking-sources.controller'
import { RankingSourcesRepository } from './ranking-sources.repository'
import { RankingSourcesService } from './ranking-sources.service'

@Module({
  imports: [TypeOrmModule.forFeature([RankingSourceEntity, ModelBenchmarkMappingEntity, BenchmarkSnapshotEntity, ModelEntity]), IdentityModule],
  controllers: [RankingSourcesController],
  providers: [HuggingFaceLeaderboardClient, RankingSourcesRepository, RankingSourcesService],
  exports: [RankingSourcesService],
})
export class RankingsModule {}
