import { Injectable, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import type { BillingAdminAuditItem, BillingAdminDetail, BillingAdminWorkspace } from '@gateway/contracts'
import { BillingService } from './billing.service'
import { ChatBillingService } from './chat-billing.service'
import { fromMicros } from './money'

@Injectable()
export class AdminBillingService {
  constructor(private readonly source: DataSource, private readonly billing: BillingService, private readonly chat: ChatBillingService) {}

  async workspaces(query = '', page = 1) {
    const parameters = [`%${query.trim()}%`]
    const [total] = await this.source.query('SELECT count(*)::int AS n FROM workspaces WHERE name ILIKE $1 OR slug ILIKE $1', parameters)
    const rows = await this.source.query(`SELECT w.id, w.name, w.slug, COALESCE(a.available_micros,0)::text AS available_micros,
      COALESCE(a.reserved_micros,0)::text AS reserved_micros FROM workspaces w LEFT JOIN billing_accounts a ON a.workspace_id = w.id
      WHERE w.name ILIKE $1 OR w.slug ILIKE $1 ORDER BY w.name,w.id LIMIT 20 OFFSET $2`, [...parameters, (page - 1) * 20])
    return { data: rows.map((row: { id: string; name: string; slug: string; available_micros: string; reserved_micros: string }): BillingAdminWorkspace => ({
      id: row.id, name: row.name, slug: row.slug, chatEnabled: this.chat.enabled(row.id),
      balance: { currency: 'CNY', available: fromMicros(row.available_micros), reserved: fromMicros(row.reserved_micros) },
    })), page, total: total.n }
  }

  async detail(workspaceId: string): Promise<BillingAdminDetail> {
    const [workspace] = await this.source.query('SELECT id,name,slug FROM workspaces WHERE id = $1', [workspaceId])
    if (!workspace) throw new NotFoundException('工作区不存在')
    const [balance, pending, ledger, auditRows] = await Promise.all([
      this.billing.balance(workspaceId), this.chat.pending(workspaceId), this.billing.ledger(workspaceId),
      this.source.query('SELECT * FROM billing_admin_actions WHERE workspace_id = $1 ORDER BY created_at DESC,id DESC LIMIT 50', [workspaceId]),
    ])
    return { workspace: { ...workspace, balance, chatEnabled: this.chat.enabled(workspaceId) }, pending, ledger,
      audit: auditRows.map((row: { operation_id: string; kind: BillingAdminAuditItem['kind']; actor_user_id: string; actor_name: string; reason: string; evidence: string; reference: string | null; before_state: { balance: BillingAdminAuditItem['beforeBalance'] }; result: BillingAdminAuditItem['result']; created_at: Date }) => ({
        operationId: row.operation_id, kind: row.kind, actorUserId: row.actor_user_id, actorName: row.actor_name,
        reason: row.reason, evidence: row.evidence, reference: row.reference, beforeBalance: row.before_state.balance, result: row.result, createdAt: row.created_at.toISOString(),
      })),
    }
  }
}
