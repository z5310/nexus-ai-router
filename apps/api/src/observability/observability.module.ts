import { Global, Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProviderChannelEntity } from '../database/entities/provider-channel.entity'
import { AUDIO_GENERATION_QUEUE } from '../audio-generation/audio-generation.queue'
import { HttpMetricsHook } from './http-metrics.hook'
import { MetricsCollectorService } from './metrics-collector.service'
import { MetricsController } from './metrics.controller'
import { ObservabilityService } from './observability.service'

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ProviderChannelEntity]), BullModule.registerQueue({ name: AUDIO_GENERATION_QUEUE })],
  controllers: [MetricsController],
  providers: [
    ObservabilityService,
    MetricsCollectorService,
    HttpMetricsHook,
  ],
  exports: [ObservabilityService],
})
export class ObservabilityModule {}
