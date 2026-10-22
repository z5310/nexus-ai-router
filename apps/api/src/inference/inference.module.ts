import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ApiKeyEntity } from '../database/entities/api-key.entity'
import { RequestLogEntity } from '../database/entities/request-log.entity'
import { UsageBucketEntity } from '../database/entities/usage-bucket.entity'
import { WorkspaceModelEntity } from '../database/entities/workspace-model.entity'
import { ApiKeyAuthGuard } from './api-key-auth.guard'
import { ChatCompletionsController } from './chat-completions.controller'
import { InferenceRepository } from './inference.repository'
import { InferenceService } from './inference.service'
import { OpenAICompatibleProviderAdapter } from './openai-compatible-provider.adapter'
import { PROVIDER_GATEWAY } from './provider-gateway'
import { OpenAIErrorFilter } from './openai-error.filter'

@Module({
  imports: [TypeOrmModule.forFeature([ApiKeyEntity, WorkspaceModelEntity, RequestLogEntity, UsageBucketEntity])],
  controllers: [ChatCompletionsController],
  providers: [
    InferenceRepository,
    InferenceService,
    ApiKeyAuthGuard,
    OpenAIErrorFilter,
    OpenAICompatibleProviderAdapter,
    { provide: PROVIDER_GATEWAY, useExisting: OpenAICompatibleProviderAdapter },
  ],
  exports: [ApiKeyAuthGuard, InferenceRepository, OpenAIErrorFilter],
})
export class InferenceModule {}
