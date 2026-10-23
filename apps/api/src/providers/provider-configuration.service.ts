import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import type { ModelDeployment, ModelDeploymentListResponse, ProviderChannel, ProviderChannelListResponse } from '@gateway/contracts'
import { createHash } from 'node:crypto'
import { QueryFailedError, Repository } from 'typeorm'
import { ModelEntity } from '../database/entities/model.entity'
import type { ModelDeploymentEntity } from '../database/entities/model-deployment.entity'
import type { ProviderChannelEntity } from '../database/entities/provider-channel.entity'
import type { ProviderEnvironment } from '../database/entities/provider-credential.entity'
import type { CreateModelDeploymentDto, ListModelDeploymentsQuery, UpdateModelDeploymentDto } from './dto/model-deployments.dto'
import type { CreateProviderChannelDto, ListProviderChannelsQuery, UpdateProviderChannelDto } from './dto/provider-channels.dto'
import { ModelDeploymentsRepository } from './model-deployments.repository'
import { ProviderChannelsRepository } from './provider-channels.repository'
import { ProviderCredentialsRepository } from './provider-credentials.repository'

export interface ResolvedProviderTarget {
  provider: string
  model: string
  channelId?: string
  deploymentId?: string
  timeoutMs?: number
  maxConcurrency?: number
}

@Injectable()
export class ProviderConfigurationService {
  constructor(
    private readonly channels: ProviderChannelsRepository,
    private readonly deployments: ModelDeploymentsRepository,
    private readonly credentials: ProviderCredentialsRepository,
    @InjectRepository(ModelEntity) private readonly models: Repository<ModelEntity>,
    private readonly config: ConfigService,
  ) {}

  async listChannels(query: ListProviderChannelsQuery): Promise<ProviderChannelListResponse> {
    return { data: (await this.channels.list(query)).map((item) => this.mapChannel(item)) }
  }

  async createChannel(actorUserId: string, input: CreateProviderChannelDto): Promise<ProviderChannel> {
    const provider = input.provider.trim().toLowerCase()
    await this.assertCredential(input.credentialId, provider, input.environment)
    const entity = this.channels.create({
      name: input.name.trim(), provider, environment: input.environment, credentialId: input.credentialId,
      region: input.region?.trim().toLowerCase() ?? 'global', timeoutMs: input.timeoutMs ?? 60_000,
      maxConcurrency: input.maxConcurrency ?? 100, enabled: input.enabled ?? true, createdByUserId: actorUserId,
    })
    return this.mapChannel(await this.persistChannel(entity))
  }

  async updateChannel(id: string, input: UpdateProviderChannelDto): Promise<ProviderChannel> {
    if (Object.values(input).every((value) => value === undefined)) throw new BadRequestException('至少提供一个需要修改的字段')
    const channel = await this.channels.find(id)
    if (!channel) throw new NotFoundException('供应商渠道不存在')
    if (input.credentialId !== undefined) {
      await this.assertCredential(input.credentialId, channel.provider, channel.environment)
      channel.credentialId = input.credentialId
    }
    if (input.name !== undefined) channel.name = input.name.trim()
    if (input.region !== undefined) channel.region = input.region.trim().toLowerCase()
    if (input.timeoutMs !== undefined) channel.timeoutMs = input.timeoutMs
    if (input.maxConcurrency !== undefined) channel.maxConcurrency = input.maxConcurrency
    if (input.enabled !== undefined) channel.enabled = input.enabled
    if (input.credentialId !== undefined || input.enabled === true) {
      channel.healthStatus = 'unknown'
      channel.consecutiveFailures = 0
      channel.lastErrorCode = null
      channel.nextProbeAt = null
    }
    return this.mapChannel(await this.persistChannel(channel))
  }

  async removeChannel(id: string): Promise<void> {
    const channel = await this.channels.find(id)
    if (!channel) throw new NotFoundException('供应商渠道不存在')
    try { await this.channels.remove(channel) } catch (error) { this.foreignKeyConflict(error, '渠道仍绑定模型部署，请先移除部署') }
  }

  async listDeployments(query: ListModelDeploymentsQuery): Promise<ModelDeploymentListResponse> {
    return { data: (await this.deployments.list(query)).map((item) => this.mapDeployment(item)) }
  }

  async createDeployment(input: CreateModelDeploymentDto): Promise<ModelDeployment> {
    const [model, channel] = await Promise.all([this.models.findOne({ where: { id: input.modelId } }), this.channels.find(input.channelId)])
    if (!model) throw new NotFoundException('平台模型不存在')
    if (!channel) throw new NotFoundException('供应商渠道不存在')
    const entity = this.deployments.create({
      modelId: model.id, channelId: channel.id, upstreamModelId: input.upstreamModelId.trim(),
      priority: input.priority ?? 100, weight: input.weight ?? 100, enabled: input.enabled ?? true,
    })
    return this.mapDeployment(await this.persistDeployment(entity))
  }

  async updateDeployment(id: string, input: UpdateModelDeploymentDto): Promise<ModelDeployment> {
    if (Object.values(input).every((value) => value === undefined)) throw new BadRequestException('至少提供一个需要修改的字段')
    const deployment = await this.deployments.find(id)
    if (!deployment) throw new NotFoundException('模型部署不存在')
    if (input.upstreamModelId !== undefined) deployment.upstreamModelId = input.upstreamModelId.trim()
    if (input.priority !== undefined) deployment.priority = input.priority
    if (input.weight !== undefined) deployment.weight = input.weight
    if (input.enabled !== undefined) deployment.enabled = input.enabled
    return this.mapDeployment(await this.persistDeployment(deployment))
  }

  async removeDeployment(id: string): Promise<void> {
    const deployment = await this.deployments.find(id)
    if (!deployment) throw new NotFoundException('模型部署不存在')
    await this.deployments.remove(deployment)
  }

  async resolveTargets(model: Pick<ModelEntity, 'id' | 'owner' | 'publicId'>, requestId = ''): Promise<ResolvedProviderTarget[]> {
    const environment = this.config.get<ProviderEnvironment>('PROVIDER_CREDENTIAL_ENV', 'development')
    const deployments = this.weightedOrder(await this.deployments.listRoutable(model.id, environment), `${requestId}:${model.id}`)
    if (deployments.length > 0) return deployments.map((item) => ({
      provider: item.channel.provider,
      model: item.upstreamModelId,
      channelId: item.channelId,
      deploymentId: item.id,
      timeoutMs: item.channel.timeoutMs,
      maxConcurrency: item.channel.maxConcurrency,
    }))
    return [{ provider: model.owner.toLowerCase(), model: this.upstreamModelId(model.publicId) }]
  }

  private weightedOrder(items: ModelDeploymentEntity[], seed: string): ModelDeploymentEntity[] {
    if (items.length < 2 || !seed) return items
    const result: ModelDeploymentEntity[] = []
    for (let index = 0; index < items.length;) {
      const first = items[index]
      const group: ModelDeploymentEntity[] = []
      while (index < items.length && items[index].priority === first.priority && items[index].channel.healthStatus === first.channel.healthStatus) {
        group.push(items[index])
        index += 1
      }
      if (group.length === 1) { result.push(group[0]); continue }
      const total = group.reduce((sum, item) => sum + item.weight, 0)
      const bucket = Number.parseInt(createHash('sha256').update(`${seed}:${first.priority}:${first.channel.healthStatus}`).digest('hex').slice(0, 12), 16) % total
      let cursor = 0
      const selectedIndex = group.findIndex((item) => {
        cursor += item.weight
        return bucket < cursor
      })
      const selected = group.splice(Math.max(0, selectedIndex), 1)[0]
      result.push(selected, ...group)
    }
    return result
  }

  async recordResult(target: ResolvedProviderTarget, errorCode?: string): Promise<void> {
    if (!target.channelId) return
    if (errorCode) await this.channels.recordFailure(target.channelId, errorCode)
    else await this.channels.recordSuccess(target.channelId)
  }

  private async assertCredential(id: string, provider: string, environment: ProviderEnvironment): Promise<void> {
    const credential = await this.credentials.find(id)
    if (!credential) throw new NotFoundException('供应商凭证不存在')
    if (credential.provider !== provider || credential.environment !== environment) throw new BadRequestException('渠道与凭证的供应商及环境必须一致')
  }

  private async persistChannel(entity: ProviderChannelEntity): Promise<ProviderChannelEntity> {
    try {
      const saved = await this.channels.save(entity)
      return (await this.channels.find(saved.id)) ?? saved
    } catch (error) { this.uniqueConflict(error, '同一供应商和环境下渠道名称必须唯一'); throw error }
  }

  private async persistDeployment(entity: ModelDeploymentEntity): Promise<ModelDeploymentEntity> {
    try {
      const saved = await this.deployments.save(entity)
      return (await this.deployments.find(saved.id)) ?? saved
    } catch (error) { this.uniqueConflict(error, '该模型、渠道与上游模型的部署已存在'); throw error }
  }

  private uniqueConflict(error: unknown, message: string): void {
    if (error instanceof QueryFailedError && (error.driverError as { code?: string }).code === '23505') throw new ConflictException(message)
  }

  private foreignKeyConflict(error: unknown, message: string): never {
    if (error instanceof QueryFailedError && (error.driverError as { code?: string }).code === '23503') throw new ConflictException(message)
    throw error
  }

  private mapChannel(entity: ProviderChannelEntity): ProviderChannel {
    return {
      id: entity.id, name: entity.name, provider: entity.provider, environment: entity.environment,
      credentialId: entity.credentialId, credentialName: entity.credential.name,
      credentialMaskedKey: `••••••••${entity.credential.secretLastFour}`, region: entity.region,
      timeoutMs: entity.timeoutMs, maxConcurrency: entity.maxConcurrency, enabled: entity.enabled,
      healthStatus: entity.healthStatus, consecutiveFailures: entity.consecutiveFailures,
      lastCheckedAt: entity.lastCheckedAt?.toISOString() ?? null, lastSuccessAt: entity.lastSuccessAt?.toISOString() ?? null,
      lastFailureAt: entity.lastFailureAt?.toISOString() ?? null, lastErrorCode: entity.lastErrorCode,
      nextProbeAt: entity.nextProbeAt?.toISOString() ?? null, createdAt: entity.createdAt.toISOString(), updatedAt: entity.updatedAt.toISOString(),
    }
  }

  private mapDeployment(entity: ModelDeploymentEntity): ModelDeployment {
    return {
      id: entity.id, modelId: entity.modelId, modelName: entity.model.name, modelPublicId: entity.model.publicId,
      channelId: entity.channelId, channelName: entity.channel.name, provider: entity.channel.provider,
      region: entity.channel.region, healthStatus: entity.channel.healthStatus, upstreamModelId: entity.upstreamModelId,
      priority: entity.priority, weight: entity.weight, enabled: entity.enabled,
      createdAt: entity.createdAt.toISOString(), updatedAt: entity.updatedAt.toISOString(),
    }
  }

  private upstreamModelId(publicId: string): string {
    const separator = publicId.indexOf('/')
    return separator === -1 ? publicId : publicId.slice(separator + 1)
  }
}
