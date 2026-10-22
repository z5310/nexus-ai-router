import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RouteRuleEntity } from '../database/entities/route-rule.entity'

@Injectable()
export class RouteRulesRepository {
  constructor(@InjectRepository(RouteRuleEntity) private readonly repository: Repository<RouteRuleEntity>) {}

  list(workspaceId: string): Promise<RouteRuleEntity[]> {
    return this.repository.find({
      where: { workspaceId },
      relations: { primaryModel: { model: true }, fallbackModel: { model: true } },
      order: { enabled: 'DESC', createdAt: 'ASC' },
    })
  }

  find(id: string, workspaceId: string): Promise<RouteRuleEntity | null> {
    return this.repository.findOne({
      where: { id, workspaceId },
      relations: { primaryModel: { model: true }, fallbackModel: { model: true } },
    })
  }

  findByName(workspaceId: string, name: string): Promise<RouteRuleEntity | null> {
    return this.repository.createQueryBuilder('rule')
      .where('rule.workspace_id = :workspaceId', { workspaceId })
      .andWhere('lower(rule.name) = lower(:name)', { name })
      .getOne()
  }

  create(input: Partial<RouteRuleEntity>): RouteRuleEntity { return this.repository.create(input) }
  save(rule: RouteRuleEntity): Promise<RouteRuleEntity> { return this.repository.save(rule) }
  async remove(rule: RouteRuleEntity): Promise<void> { await this.repository.remove(rule) }
}
