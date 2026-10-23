import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AudioGenerationTaskEntity } from '../database/entities/audio-generation-task.entity'
import { IdentityModule } from '../identity/identity.module'
import { InferenceModule } from '../inference/inference.module'
import { ProvidersModule } from '../providers/providers.module'
import { AUDIO_GENERATION_QUEUE } from './audio-generation.queue'
import { AudioGenerationController } from './audio-generation.controller'
import { AudioGenerationProcessor } from './audio-generation.processor'
import { AudioGenerationRepository } from './audio-generation.repository'
import { AudioGenerationService } from './audio-generation.service'
import { AudioProviderGateway } from './audio-provider.gateway'

@Module({
  imports: [
    IdentityModule, InferenceModule, ProvidersModule,
    TypeOrmModule.forFeature([AudioGenerationTaskEntity]),
    BullModule.registerQueue({ name: AUDIO_GENERATION_QUEUE }),
  ],
  controllers: [AudioGenerationController],
  providers: [AudioGenerationRepository, AudioGenerationService, AudioGenerationProcessor, AudioProviderGateway],
})
export class AudioGenerationModule {}
