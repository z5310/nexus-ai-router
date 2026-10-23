import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { QueryFailedError } from 'typeorm'
import type { ProviderDefinition, ProviderDefinitionListResponse } from '@gateway/contracts'
import type { ProviderEntity } from '../database/entities/provider.entity'
import type { CreateProviderDto, ListProvidersQuery, UpdateProviderDto } from './dto/providers.dto'
import { ProvidersRepository } from './providers.repository'

@Injectable()
export class ProvidersService {
  constructor(private readonly providers: ProvidersRepository) {}

  async list(query: ListProvidersQuery = {}): Promise<ProviderDefinitionListResponse> {
    return { data: (await this.providers.list(query)).map((item) => this.map(item)) }
  }

  async create(actorUserId: string, input: CreateProviderDto): Promise<ProviderDefinition> {
    const entity = this.providers.create({
      code: input.code.trim().toLowerCase(), name: input.name.trim(), protocol: input.protocol,
      baseUrl: this.optionalUrl(input.baseUrl), docsUrl: this.optionalUrl(input.docsUrl),
      capabilities: input.capabilities, enabled: input.enabled ?? true, sortOrder: input.sortOrder ?? 100,
      createdByUserId: actorUserId,
    })
    return this.map(await this.persist(entity))
  }

  async update(id: string, input: UpdateProviderDto): Promise<ProviderDefinition> {
    if (Object.values(input).every((value) => value === undefined)) throw new BadRequestException('至少提供一个需要修改的字段')
    const entity = await this.providers.find(id)
    if (!entity) throw new NotFoundException('供应商不存在')
    if (input.name !== undefined) entity.name = input.name.trim()
    if (input.protocol !== undefined) entity.protocol = input.protocol
    if (input.baseUrl !== undefined) entity.baseUrl = this.optionalUrl(input.baseUrl)
    if (input.docsUrl !== undefined) entity.docsUrl = this.optionalUrl(input.docsUrl)
    if (input.capabilities !== undefined) entity.capabilities = input.capabilities
    if (input.enabled !== undefined) entity.enabled = input.enabled
    if (input.sortOrder !== undefined) entity.sortOrder = input.sortOrder
    return this.map(await this.persist(entity))
  }

  async remove(id: string): Promise<void> {
    const entity = await this.providers.find(id)
    if (!entity) throw new NotFoundException('供应商不存在')
    try { await this.providers.remove(entity) } catch (error) {
      if (error instanceof QueryFailedError && (error.driverError as { code?: string }).code === '23503') {
        throw new ConflictException('供应商已绑定凭证或渠道，请先移除关联配置')
      }
      throw error
    }
  }

  async assertEnabled(code: string): Promise<ProviderEntity> {
    const entity = await this.providers.findByCode(code.trim().toLowerCase())
    if (!entity) throw new BadRequestException('供应商未在平台管理端登记')
    if (!entity.enabled) throw new BadRequestException('供应商已停用，不能新增凭证或渠道')
    return entity
  }

  private async persist(entity: ProviderEntity): Promise<ProviderEntity> {
    try { return await this.providers.save(entity) } catch (error) {
      if (error instanceof QueryFailedError && (error.driverError as { code?: string }).code === '23505') throw new ConflictException('供应商标识已存在')
      throw error
    }
  }

  private optionalUrl(value?: string | null): string | null { return value?.trim() || null }

  private map(entity: ProviderEntity): ProviderDefinition {
    return {
      id: entity.id, code: entity.code, name: entity.name, protocol: entity.protocol,
      baseUrl: entity.baseUrl, docsUrl: entity.docsUrl, capabilities: entity.capabilities,
      enabled: entity.enabled, sortOrder: entity.sortOrder,
      createdAt: entity.createdAt.toISOString(), updatedAt: entity.updatedAt.toISOString(),
    }
  }
}
