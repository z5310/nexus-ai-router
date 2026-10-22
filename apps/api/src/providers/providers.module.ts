import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProviderCredentialEntity } from '../database/entities/provider-credential.entity'
import { IdentityModule } from '../identity/identity.module'
import { CredentialCipherService } from './credential-cipher.service'
import { ProviderCredentialsController } from './provider-credentials.controller'
import { ProviderCredentialsRepository } from './provider-credentials.repository'
import { ProviderCredentialsService } from './provider-credentials.service'

@Module({
  imports: [TypeOrmModule.forFeature([ProviderCredentialEntity]), IdentityModule],
  controllers: [ProviderCredentialsController],
  providers: [ProviderCredentialsRepository, ProviderCredentialsService, CredentialCipherService],
  exports: [ProviderCredentialsService],
})
export class ProvidersModule {}
