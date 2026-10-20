import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { BullModule } from '@nestjs/bullmq'
import { TypeOrmModule } from '@nestjs/typeorm'
import { LoggerModule } from 'nestjs-pino'
import { validateEnvironment } from './config/env'
import { ModelEntity } from './database/entities/model.entity'
import { RequestLogEntity } from './database/entities/request-log.entity'
import { UsageBucketEntity } from './database/entities/usage-bucket.entity'
import { CreateModels1760000000000 } from './database/migrations/1760000000000-CreateModels'
import { ExpandCatalogAndUsage1760000001000 } from './database/migrations/1760000001000-ExpandCatalogAndUsage'
import { DashboardModule } from './dashboard/dashboard.module'
import { HealthController } from './health/health.controller'
import { ModelsModule } from './models/models.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req) => req.headers['x-request-id']?.toString() ?? crypto.randomUUID(),
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [ModelEntity, RequestLogEntity, UsageBucketEntity],
        migrations: [CreateModels1760000000000, ExpandCatalogAndUsage1760000001000],
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
    ModelsModule,
    DashboardModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
