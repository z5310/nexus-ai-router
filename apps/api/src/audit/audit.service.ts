import { Injectable } from '@nestjs/common'
import type { AuditLogListResponse } from '@gateway/contracts'
import { AuditRepository } from './audit.repository'
import type { ListAuditLogsQuery } from './dto/admin-security.dto'

export interface AppendAuditInput {
  actorUserId: string | null
  actorEmail: string | null
  action: string
  resourceType: string
  resourceId: string | null
  outcome: 'success' | 'failure'
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
  requestId?: string | null
}

@Injectable()
export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  async list(query: ListAuditLogsQuery): Promise<AuditLogListResponse> {
    const [rows, total] = await this.repository.list(query)
    return {
      data: rows.map((row) => ({
        id: row.id,
        actorUserId: row.actorUserId,
        actorEmail: row.actorEmail,
        action: row.action,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        outcome: row.outcome,
        metadata: row.metadata,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        requestId: row.requestId,
        createdAt: row.createdAt.toISOString(),
      })),
      pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
    }
  }

  async record(input: AppendAuditInput): Promise<void> {
    await this.repository.append({
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      action: input.action.slice(0, 100),
      resourceType: input.resourceType.slice(0, 80),
      resourceId: input.resourceId?.slice(0, 160) ?? null,
      outcome: input.outcome,
      metadata: input.metadata ?? {},
      ipAddress: input.ipAddress?.slice(0, 64) ?? null,
      userAgent: input.userAgent?.slice(0, 500) ?? null,
      requestId: input.requestId?.slice(0, 100) ?? null,
    })
  }
}
