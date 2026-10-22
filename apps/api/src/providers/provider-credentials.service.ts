import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'node:crypto'
import { QueryFailedError } from 'typeorm'
import type { ProviderCredential, ProviderCredentialListResponse } from '@gateway/contracts'
import type { ProviderCredentialEntity, ProviderEnvironment } from '../database/entities/provider-credential.entity'
import { CredentialCipherService } from './credential-cipher.service'
import type { CreateProviderCredentialDto, ListProviderCredentialsQuery, UpdateProviderCredentialDto } from './dto/provider-credentials.dto'
import { ProviderCredentialsRepository } from './provider-credentials.repository'

@Injectable()
export class ProviderCredentialsService {
  constructor(
    private readonly credentials: ProviderCredentialsRepository,
    private readonly cipher: CredentialCipherService,
    private readonly config: ConfigService,
  ) {}

  async list(query: ListProviderCredentialsQuery): Promise<ProviderCredentialListResponse> {
    return { data: (await this.credentials.list(query)).map((credential) => this.map(credential)) }
  }

  async create(actorUserId: string, input: CreateProviderCredentialDto): Promise<ProviderCredential> {
    const id = randomUUID()
    const provider = input.provider.trim().toLowerCase()
    const encrypted = this.cipher.encrypt(input.apiKey, { id, provider, environment: input.environment })
    const credential = this.credentials.create({
      id,
      provider,
      environment: input.environment,
      name: input.name.trim(),
      ...encrypted,
      secretLastFour: input.apiKey.slice(-4),
      enabled: input.enabled ?? true,
      createdByUserId: actorUserId,
      rotatedAt: new Date(),
    })
    return this.map(await this.persist(credential))
  }

  async update(id: string, input: UpdateProviderCredentialDto): Promise<ProviderCredential> {
    if (input.name === undefined && input.apiKey === undefined && input.enabled === undefined) {
      throw new BadRequestException('至少提供一个需要修改的字段')
    }
    const credential = await this.credentials.find(id)
    if (!credential) throw new NotFoundException('供应商凭证不存在')
    if (input.name !== undefined) credential.name = input.name.trim()
    if (input.enabled !== undefined) credential.enabled = input.enabled
    if (input.apiKey !== undefined) {
      Object.assign(credential, this.cipher.encrypt(input.apiKey, credential))
      credential.secretLastFour = input.apiKey.slice(-4)
      credential.rotatedAt = new Date()
    }
    return this.map(await this.persist(credential))
  }

  async remove(id: string): Promise<void> {
    const credential = await this.credentials.find(id)
    if (!credential) throw new NotFoundException('供应商凭证不存在')
    await this.credentials.remove(credential)
  }

  async resolve(provider: string): Promise<string> {
    const environment = this.config.get<ProviderEnvironment>('PROVIDER_CREDENTIAL_ENV', 'development')
    const normalizedProvider = provider.trim().toLowerCase()
    const credential = await this.credentials.findActive(normalizedProvider, environment)
    if (!credential) throw new ServiceUnavailableException(`供应商 ${normalizedProvider} 在当前环境没有可用凭证`)
    return this.cipher.decrypt(credential, credential)
  }

  private async persist(credential: ProviderCredentialEntity): Promise<ProviderCredentialEntity> {
    try {
      return await this.credentials.save(credential)
    } catch (error) {
      if (error instanceof QueryFailedError && (error.driverError as { code?: string }).code === '23505') {
        throw new ConflictException('同一环境下凭证名称必须唯一，且每个供应商只能启用一个凭证')
      }
      throw error
    }
  }

  private map(credential: ProviderCredentialEntity): ProviderCredential {
    return {
      id: credential.id,
      provider: credential.provider,
      environment: credential.environment,
      name: credential.name,
      maskedKey: `••••••••${credential.secretLastFour}`,
      enabled: credential.enabled,
      keyVersion: credential.keyVersion,
      rotatedAt: credential.rotatedAt.toISOString(),
      createdAt: credential.createdAt.toISOString(),
      updatedAt: credential.updatedAt.toISOString(),
    }
  }
}
