import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProviderCredentialEntity, type ProviderEnvironment } from '../database/entities/provider-credential.entity'

@Injectable()
export class ProviderCredentialsRepository {
  constructor(
    @InjectRepository(ProviderCredentialEntity)
    private readonly repository: Repository<ProviderCredentialEntity>,
  ) {}

  list(filters: { provider?: string; environment?: ProviderEnvironment }): Promise<ProviderCredentialEntity[]> {
    return this.repository.find({
      where: filters,
      order: { environment: 'ASC', provider: 'ASC', name: 'ASC' },
    })
  }

  find(id: string): Promise<ProviderCredentialEntity | null> {
    return this.repository.findOne({ where: { id } })
  }

  findActive(provider: string, environment: ProviderEnvironment): Promise<ProviderCredentialEntity | null> {
    return this.repository.findOne({ where: { provider, environment, enabled: true } })
  }

  create(input: Partial<ProviderCredentialEntity>): ProviderCredentialEntity {
    return this.repository.create(input)
  }

  save(credential: ProviderCredentialEntity): Promise<ProviderCredentialEntity> {
    return this.repository.save(credential)
  }

  async remove(credential: ProviderCredentialEntity): Promise<void> {
    await this.repository.remove(credential)
  }
}
