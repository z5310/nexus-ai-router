import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ApiKeyEntity } from '../database/entities/api-key.entity'
import { IdentityModule } from '../identity/identity.module'
import { ApiKeysController } from './api-keys.controller'
import { ApiKeysRepository } from './api-keys.repository'
import { ApiKeysService } from './api-keys.service'

@Module({
  imports: [TypeOrmModule.forFeature([ApiKeyEntity]), IdentityModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysRepository, ApiKeysService],
})
export class ApiKeysModule {}
