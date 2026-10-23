import { WorkspaceIpPolicy1760000009000 } from './database/migrations/1760000009000-WorkspaceIpPolicy'
import { SessionRotation1760000008000 } from './database/migrations/1760000008000-SessionRotation'
import { Module } from '@nestjs/common'
import { resolve } from 'node:path'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { BullModule } from '@nestjs/bullmq'
import { TypeOrmModule } from '@nestjs/typeorm'
import { LoggerModule } from 'nestjs-pino'
import { validateEnvironment } from './config/env'
import { ModelEntity } from './database/entities/model.entity'
import { RequestLogEntity } from './database/entities/request-log.entity'
import { UsageBucketEntity } from './database/entities/usage-bucket.entity'
import { UserEntity } from './database/entities/user.entity'
import { AuthSessionEntity } from './database/entities/auth-session.entity'
import { AuthActionTokenEntity } from './database/entities/auth-action-token.entity'
import { ApiKeyEntity } from './database/entities/api-key.entity'
import { WorkspaceModelEntity } from './database/entities/workspace-model.entity'
import { RouteRuleEntity } from './database/entities/route-rule.entity'
import { WorkspaceEntity } from './database/entities/workspace.entity'
import { WorkspaceMemberEntity } from './database/entities/workspace-member.entity'
import { ProjectEntity } from './database/entities/project.entity'
import { ProviderCredentialEntity } from './database/entities/provider-credential.entity'
import { InferenceAttemptEntity } from './database/entities/inference-attempt.entity'
import { CreateModels1760000000000 } from './database/migrations/1760000000000-CreateModels'
import { ExpandCatalogAndUsage1760000001000 } from './database/migrations/1760000001000-ExpandCatalogAndUsage'
import { CreateIdentity1760000002000 } from './database/migrations/1760000002000-CreateIdentity'
import { HardenIdentity1760000003000 } from './database/migrations/1760000003000-HardenIdentity'
import { CreateWorkspaceConfiguration1760000004000 } from './database/migrations/1760000004000-CreateWorkspaceConfiguration'
import { CreateRouteRulesAndScopeUsage1760000005000 } from './database/migrations/1760000005000-CreateRouteRulesAndScopeUsage'
import { CreateWorkspaceTenancy1760000006000 } from './database/migrations/1760000006000-CreateWorkspaceTenancy'
import { CreateProviderCredentials1760000007000 } from './database/migrations/1760000007000-CreateProviderCredentials'
import { CreateInferenceAttempts1760000010000 } from './database/migrations/1760000010000-CreateInferenceAttempts'
import { DashboardModule } from './dashboard/dashboard.module'
import { HealthController } from './health/health.controller'
import { ModelsModule } from './models/models.module'
import { IdentityModule } from './identity/identity.module'
import { ApiKeysModule } from './api-keys/api-keys.module'
import { RoutingModule } from './routing/routing.module'
import { InferenceModule } from './inference/inference.module'
import { ProvidersModule } from './providers/providers.module'
import { TrafficControlModule } from './traffic-control/traffic-control.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(__dirname, '../../../.env'), '.env'],
      validate: validateEnvironment,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req) => req.id ?? crypto.randomUUID(),
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers.x-api-key',
          'req.headers.x-portkey-api-key',
          'req.headers.x-portkey-virtual-key',
        ],
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [ModelEntity, RequestLogEntity, InferenceAttemptEntity, UsageBucketEntity, UserEntity, AuthSessionEntity, AuthActionTokenEntity, ApiKeyEntity, WorkspaceModelEntity, RouteRuleEntity, WorkspaceEntity, WorkspaceMemberEntity, ProjectEntity, ProviderCredentialEntity],
        migrations: [CreateModels1760000000000, ExpandCatalogAndUsage1760000001000, CreateIdentity1760000002000, HardenIdentity1760000003000, CreateWorkspaceConfiguration1760000004000, CreateRouteRulesAndScopeUsage1760000005000, CreateWorkspaceTenancy1760000006000, CreateProviderCredentials1760000007000, SessionRotation1760000008000, WorkspaceIpPolicy1760000009000, CreateInferenceAttempts1760000010000],
        synchronize: false,
        migrationsRun: false,
        retryAttempts: 10,
        retryDelay: 2_000,
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.getOrThrow<string>('REDIS_URL') },
      }),
    }),
    TrafficControlModule,
    ModelsModule,
    DashboardModule,
    IdentityModule,
    ApiKeysModule,
    RoutingModule,
    ProvidersModule,
    InferenceModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
