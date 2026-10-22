import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { RouteRule, RouteRuleListResponse } from '@gateway/contracts'
import type { RouteRuleEntity } from '../database/entities/route-rule.entity'
import { WorkspaceModelsRepository } from '../models/workspace-models.repository'
import type { CreateRouteRuleDto, UpdateRouteRuleDto } from './dto/route-rules.dto'
import { RouteRulesRepository } from './route-rules.repository'

@Injectable()
export class RouteRulesService {
  constructor(private readonly rules: RouteRulesRepository, private readonly models: WorkspaceModelsRepository) {}

  async list(workspaceId: string): Promise<RouteRuleListResponse> {
    return { data: (await this.rules.list(workspaceId)).map((rule) => this.map(rule)) }
  }

  async create(workspaceId: string, actorUserId: string, input: CreateRouteRuleDto): Promise<RouteRule> {
    const name = input.name.trim()
    if (await this.rules.findByName(workspaceId, name)) throw new ConflictException('路由规则名称已存在')
    await this.validateModels(workspaceId, input.primaryModelId, input.fallbackModelId ?? null)
    const saved = await this.rules.save(this.rules.create({
      userId: actorUserId,
      workspaceId,
      name,
      matchType: input.matchType,
      strategy: input.strategy,
      primaryModelId: input.primaryModelId,
      fallbackModelId: input.fallbackModelId ?? null,
      trafficPercent: input.trafficPercent,
      enabled: input.enabled,
    }))
    return this.map((await this.rules.find(saved.id, workspaceId))!)
  }

  async update(workspaceId: string, id: string, input: UpdateRouteRuleDto): Promise<RouteRule> {
    const rule = await this.rules.find(id, workspaceId)
    if (!rule) throw new NotFoundException('路由规则不存在')
    if (input.name !== undefined) {
      const name = input.name.trim()
      const duplicate = await this.rules.findByName(workspaceId, name)
      if (duplicate && duplicate.id !== id) throw new ConflictException('路由规则名称已存在')
      rule.name = name
    }
    const primaryModelId = input.primaryModelId ?? rule.primaryModelId
    const fallbackModelId = input.fallbackModelId !== undefined ? input.fallbackModelId : rule.fallbackModelId
    if (input.primaryModelId !== undefined || input.fallbackModelId !== undefined) await this.validateModels(workspaceId, primaryModelId, fallbackModelId)
    if (input.matchType !== undefined) rule.matchType = input.matchType
    if (input.strategy !== undefined) rule.strategy = input.strategy
    if (input.primaryModelId !== undefined) rule.primaryModelId = input.primaryModelId
    if (input.fallbackModelId !== undefined) rule.fallbackModelId = input.fallbackModelId
    if (input.trafficPercent !== undefined) rule.trafficPercent = input.trafficPercent
    if (input.enabled !== undefined) rule.enabled = input.enabled
    await this.rules.save(rule)
    return this.map((await this.rules.find(id, workspaceId))!)
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    const rule = await this.rules.find(id, workspaceId)
    if (!rule) throw new NotFoundException('路由规则不存在')
    await this.rules.remove(rule)
  }

  private async validateModels(workspaceId: string, primaryId: string, fallbackId: string | null): Promise<void> {
    if (primaryId === fallbackId) throw new BadRequestException('主模型和故障转移模型不能相同')
    const primary = await this.models.find(primaryId, workspaceId)
    if (!primary || !primary.enabled) throw new BadRequestException('主模型必须是当前工作区中已启用的模型')
    if (fallbackId) {
      const fallback = await this.models.find(fallbackId, workspaceId)
      if (!fallback || !fallback.enabled) throw new BadRequestException('故障转移模型必须是当前工作区中已启用的模型')
    }
  }

  private map(rule: RouteRuleEntity): RouteRule {
    return {
      id: rule.id,
      name: rule.name,
      matchType: rule.matchType,
      strategy: rule.strategy,
      primaryModelId: rule.primaryModelId,
      primaryModelName: rule.primaryModel.alias || rule.primaryModel.model.name,
      fallbackModelId: rule.fallbackModelId,
      fallbackModelName: rule.fallbackModel ? rule.fallbackModel.alias || rule.fallbackModel.model.name : null,
      trafficPercent: rule.trafficPercent,
      enabled: rule.enabled,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    }
  }
}
