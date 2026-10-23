import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { createHash } from 'node:crypto'
import { Repository } from 'typeorm'
import type { RouteStrategy } from '@gateway/contracts'
import { RouteRuleEntity } from '../database/entities/route-rule.entity'
import type { WorkspaceModelEntity } from '../database/entities/workspace-model.entity'
import { InferenceRepository } from './inference.repository'

export interface RoutingDecision {
  requested: WorkspaceModelEntity
  routeRuleId: string | null
  routeRuleName: string | null
  candidates: WorkspaceModelEntity[]
}

@Injectable()
export class RoutingExecutorService {
  constructor(
    private readonly inference: InferenceRepository,
    @InjectRepository(RouteRuleEntity) private readonly rules: Repository<RouteRuleEntity>,
  ) {}

  async resolve(workspaceId: string, requestedPublicId: string, requestId: string): Promise<RoutingDecision> {
    const requested = await this.inference.findRoutableModel(workspaceId, requestedPublicId)
    if (!requested) throw new NotFoundException('模型未在当前工作区启用')

    const rules = await this.rules.find({
      where: [
        { workspaceId, enabled: true, matchType: 'all' },
        { workspaceId, enabled: true, matchType: requested.model.modelType },
      ],
      relations: { primaryModel: { model: true }, fallbackModel: { model: true } },
      order: { createdAt: 'ASC' },
    })

    for (const rule of rules) {
      if (!this.inTrafficBucket(requestId, rule.id, rule.trafficPercent)) continue
      const candidates = this.orderCandidates(
        [rule.primaryModel, rule.fallbackModel]
          .filter((candidate): candidate is WorkspaceModelEntity => Boolean(candidate?.enabled && candidate.model.isEnabled))
          .filter((candidate) => candidate.model.modelType === requested.model.modelType),
        rule.strategy,
      )
      if (candidates.length > 0) {
        return { requested, routeRuleId: rule.id, routeRuleName: rule.name, candidates }
      }
    }

    return { requested, routeRuleId: null, routeRuleName: null, candidates: [requested] }
  }

  private inTrafficBucket(requestId: string, ruleId: string, trafficPercent: number): boolean {
    if (trafficPercent >= 100) return true
    const digest = createHash('sha256').update(`${requestId}:${ruleId}`).digest()
    return digest.readUInt32BE(0) % 100 < trafficPercent
  }

  private orderCandidates(candidates: WorkspaceModelEntity[], strategy: RouteStrategy): WorkspaceModelEntity[] {
    const unique = [...new Map(candidates.map((candidate) => [candidate.id, candidate])).values()]
    if (strategy === 'priority') return unique
    return unique.sort((left, right) => {
      if (strategy === 'lowest_latency') return left.model.latencyMs - right.model.latencyMs
      return this.unitCost(left) - this.unitCost(right)
    })
  }

  private unitCost(candidate: WorkspaceModelEntity): number {
    return Number(candidate.model.inputPrice) + Number(candidate.model.outputPrice ?? 0)
  }
}
