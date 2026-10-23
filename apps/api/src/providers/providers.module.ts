import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProviderCredentialEntity } from '../database/entities/provider-credential.entity'
import { ProviderChannelEntity } from '../database/entities/provider-channel.entity'
import { ModelDeploymentEntity } from '../database/entities/model-deployment.entity'
import { ModelEntity } from '../database/entities/model.entity'
import { IdentityModule } from '../identity/identity.module'
import { CredentialCipherService } from './credential-cipher.service'
import { ProviderCredentialsController } from './provider-credentials.controller'
import { ProviderCredentialsRepository } from './provider-credentials.repository'
import { ProviderCredentialsService } from './provider-credentials.service'
import { ProviderChannelsController } from './provider-channels.controller'
import { ModelDeploymentsController } from './model-deployments.controller'
import { ProviderChannelsRepository } from './provider-channels.repository'
import { ModelDeploymentsRepository } from './model-deployments.repository'
import { ProviderConfigurationService } from './provider-configuration.service'

@Module({
  imports: [TypeOrmModule.forFeature([ProviderCredentialEntity, ProviderChannelEntity, ModelDeploymentEntity, ModelEntity]), IdentityModule],
  controllers: [ProviderCredentialsController, ProviderChannelsController, ModelDeploymentsController],
  providers: [ProviderCredentialsRepository, ProviderCredentialsService, ProviderChannelsRepository, ModelDeploymentsRepository, ProviderConfigurationService, CredentialCipherService],
  exports: [ProviderCredentialsService, ProviderConfigurationService],
})
export class ProvidersModule {}
