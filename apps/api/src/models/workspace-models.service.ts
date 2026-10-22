import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { WorkspaceModelConfig, WorkspaceModelListResponse } from '@gateway/contracts'
import type { WorkspaceModelEntity } from '../database/entities/workspace-model.entity'
import type { CreateWorkspaceModelDto, UpdateWorkspaceModelDto } from './dto/workspace-models.dto'
import { ModelsRepository } from './models.repository'
import { WorkspaceModelsRepository } from './workspace-models.repository'

@Injectable()
export class WorkspaceModelsService {
  constructor(private readonly configs: WorkspaceModelsRepository, private readonly models: ModelsRepository) {}

  async list(userId: string): Promise<WorkspaceModelListResponse> {
    return { data: (await this.configs.list(userId)).map((config) => this.map(config)) }
  }

  async create(userId: string, input: CreateWorkspaceModelDto): Promise<WorkspaceModelConfig> {
    const model = await this.models.findAdmin(input.modelId)
    if (!model || !model.isEnabled) throw new NotFoundException('可用模型不存在')
    if (await this.configs.findByModel(userId, input.modelId)) throw new ConflictException('该模型已经接入工作区')
    const config = this.configs.create({
      userId,
      modelId: input.modelId,
      model,
      alias: input.alias?.trim() || null,
      priority: input.priority,
      rateLimitRpm: input.rateLimitRpm,
      dailyBudgetCny: input.dailyBudgetCny == null ? null : input.dailyBudgetCny.toFixed(2),
      enabled: input.enabled,
    })
    return this.map(await this.configs.save(config))
  }

  async update(userId: string, id: string, input: UpdateWorkspaceModelDto): Promise<WorkspaceModelConfig> {
    const config = await this.configs.find(id, userId)
    if (!config) throw new NotFoundException('工作区模型配置不存在')
    if (input.alias !== undefined) config.alias = input.alias?.trim() || null
    if (input.priority !== undefined) config.priority = input.priority
    if (input.rateLimitRpm !== undefined) config.rateLimitRpm = input.rateLimitRpm
    if (input.dailyBudgetCny !== undefined) config.dailyBudgetCny = input.dailyBudgetCny === null ? null : input.dailyBudgetCny.toFixed(2)
    if (input.enabled !== undefined) config.enabled = input.enabled
    const saved = await this.configs.save(config)
    saved.model = config.model
    return this.map(saved)
  }

  async remove(userId: string, id: string): Promise<void> {
    const config = await this.configs.find(id, userId)
    if (!config) throw new NotFoundException('工作区模型配置不存在')
    await this.configs.remove(config)
  }

  private map(config: WorkspaceModelEntity): WorkspaceModelConfig {
    return {
      id: config.id,
      modelId: config.modelId,
      name: config.model.name,
      slug: config.model.publicId,
      provider: config.model.provider,
      type: config.model.modelType,
      inputPrice: Number(config.model.inputPrice),
      status: config.model.status,
      alias: config.alias,
      priority: config.priority,
      rateLimitRpm: config.rateLimitRpm,
      dailyBudgetCny: config.dailyBudgetCny === null ? null : Number(config.dailyBudgetCny),
      enabled: config.enabled,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    }
  }
}
