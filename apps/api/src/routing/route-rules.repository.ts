import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RouteRuleEntity } from '../database/entities/route-rule.entity'

@Injectable()
export class RouteRulesRepository {
  constructor(@InjectRepository(RouteRuleEntity) private readonly repository: Repository<RouteRuleEntity>) {}

  list(userId: string): Promise<RouteRuleEntity[]> {
    return this.repository.find({
      where: { userId },
      relations: { primaryModel: { model: true }, fallbackModel: { model: true } },
      order: { enabled: 'DESC', createdAt: 'ASC' },
    })
  }

  find(id: string, userId: string): Promise<RouteRuleEntity | null> {
    return this.repository.findOne({
      where: { id, userId },
      relations: { primaryModel: { model: true }, fallbackModel: { model: true } },
    })
  }

  findByName(userId: string, name: string): Promise<RouteRuleEntity | null> {
    return this.repository.createQueryBuilder('rule')
      .where('rule.user_id = :userId', { userId })
      .andWhere('lower(rule.name) = lower(:name)', { name })
      .getOne()
  }

  create(input: Partial<RouteRuleEntity>): RouteRuleEntity { return this.repository.create(input) }
  save(rule: RouteRuleEntity): Promise<RouteRuleEntity> { return this.repository.save(rule) }
  async remove(rule: RouteRuleEntity): Promise<void> { await this.repository.remove(rule) }
}
