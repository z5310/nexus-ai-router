import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ApiKeyEntity } from '../database/entities/api-key.entity'
import { RequestLogEntity } from '../database/entities/request-log.entity'
import { UsageBucketEntity } from '../database/entities/usage-bucket.entity'
import { WorkspaceModelEntity } from '../database/entities/workspace-model.entity'
import { RouteRuleEntity } from '../database/entities/route-rule.entity'
import { InferenceAttemptEntity } from '../database/entities/inference-attempt.entity'
import { ApiKeyAuthGuard } from './api-key-auth.guard'
import { ChatCompletionsController } from './chat-completions.controller'
import { InferenceRepository } from './inference.repository'
import { InferenceService } from './inference.service'
import { OpenAICompatibleProviderAdapter } from './openai-compatible-provider.adapter'
import { PROVIDER_GATEWAY } from './provider-gateway'
import { OpenAIErrorFilter } from './openai-error.filter'
import { IdentityModule } from '../identity/identity.module'
import { PlaygroundController } from './playground.controller'
import { RoutingExecutorService } from './routing-executor.service'
import { ProvidersModule } from '../providers/providers.module'

@Module({
  imports: [IdentityModule, ProvidersModule, TypeOrmModule.forFeature([ApiKeyEntity, WorkspaceModelEntity, RouteRuleEntity, RequestLogEntity, InferenceAttemptEntity, UsageBucketEntity])],
  controllers: [ChatCompletionsController, PlaygroundController],
  providers: [
    InferenceRepository,
    InferenceService,
    RoutingExecutorService,
    ApiKeyAuthGuard,
    OpenAIErrorFilter,
    OpenAICompatibleProviderAdapter,
    { provide: PROVIDER_GATEWAY, useExisting: OpenAICompatibleProviderAdapter },
  ],
  exports: [ApiKeyAuthGuard, InferenceRepository, OpenAIErrorFilter],
})
export class InferenceModule {}
