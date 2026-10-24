import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLogEntity } from '../database/entities/audit-log.entity'
import type { ListAuditLogsQuery } from './dto/admin-security.dto'

@Injectable()
export class AuditRepository {
  constructor(@InjectRepository(AuditLogEntity) private readonly repository: Repository<AuditLogEntity>) {}

  append(input: Omit<AuditLogEntity, 'id' | 'createdAt'>): Promise<AuditLogEntity> {
    return this.repository.save(this.repository.create(input))
  }

  async list(query: ListAuditLogsQuery): Promise<[AuditLogEntity[], number]> {
    const builder = this.repository.createQueryBuilder('audit')
    if (query.query?.trim()) {
      builder.andWhere('(audit.actorEmail ILIKE :query OR audit.action ILIKE :query OR audit.resourceId ILIKE :query)', { query: `%${query.query.trim()}%` })
    }
    if (query.action) builder.andWhere('audit.action = :action', { action: query.action })
    if (query.resourceType) builder.andWhere('audit.resourceType = :resourceType', { resourceType: query.resourceType })
    if (query.outcome) builder.andWhere('audit.outcome = :outcome', { outcome: query.outcome })
    return builder.orderBy('audit.createdAt', 'DESC').addOrderBy('audit.id', 'DESC')
      .skip((query.page - 1) * query.pageSize).take(query.pageSize).getManyAndCount()
  }
}
