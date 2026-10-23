import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource, type EntityManager } from 'typeorm'
import type { BillingAdminActionInput, BillingAdminActionResult, BillingAdminGrantInput, BillingAdminResolutionInput, BillingBalance, BillingLedgerResponse, BillingReservation, BillingResolutionPreview, RequestPriceSnapshot } from '@gateway/contracts'
import { fromMicros, toMicros } from './money'
import { isUUID } from 'class-validator'
import { chatSnapshotMicros } from '../inference/price-snapshot'

type Account = { available_micros: string; reserved_micros: string }
type Reservation = { request_id: string; status: BillingReservation['status']; amount_micros: string; settled_micros: string | null; outcome?: string | null; parent_request_id?: string | null; price_snapshot?: RequestPriceSnapshot | null }

@Injectable()
export class BillingService {
  constructor(private readonly source: DataSource) {}

  async adminGrant(workspaceId: string, actorId: string, input: BillingAdminGrantInput): Promise<BillingAdminActionResult> {
    this.adminInput(input)
    const amount = toMicros(input.amount)
    if (!amount) throw new BadRequestException('授予额度必须大于零')
    const payload = { amount: fromMicros(amount), reason: input.reason.trim(), evidence: input.evidence.trim() }
    return this.locked(workspaceId, async (manager, account) => {
      const actor = await this.adminActor(manager, actorId)
      const prior = await this.adminReplay(manager, workspaceId, actorId, input.operationId, 'grant', payload)
      if (prior) return prior
      const [workspace] = await manager.query('SELECT status FROM workspaces WHERE id = $1 FOR SHARE', [workspaceId])
      if (workspace.status !== 'active') throw new ConflictException('仅可向有效工作区授予额度')
      const before = { balance: this.mapBalance(account) }
      const balance = await this.change(manager, workspaceId, account, 'grant', `admin:${input.operationId}`, amount, amount, 0n)
      const result = { operationId: input.operationId, workspaceId, balance }
      await this.adminAudit(manager, workspaceId, actor, input, 'grant', null, payload, before, result)
      return result
    })
  }

  async previewResolution(workspaceId: string, reference: string, input: Pick<BillingAdminResolutionInput, 'action' | 'inputTokens' | 'outputTokens'>): Promise<BillingResolutionPreview> {
    this.reference(reference)
    const row = await this.reservation(this.source.manager, workspaceId, reference)
    this.reviewable(row)
    const amount = this.resolutionAmount(row!, input)
    const balance = await this.balance(workspaceId)
    const availableAfter = toMicros(balance.available) + BigInt(row!.amount_micros) - amount
    return { action: input.action, amount: fromMicros(amount), reserved: fromMicros(row!.amount_micros), availableAfter: fromMicros(availableAfter), sufficient: availableAfter >= 0n }
  }

  async adminResolve(workspaceId: string, actorId: string, reference: string, input: BillingAdminResolutionInput): Promise<BillingAdminActionResult> {
    this.adminInput(input)
    this.reference(reference)
    const payload = { reference, action: input.action, inputTokens: input.action === 'settle' ? input.inputTokens : null, outputTokens: input.action === 'settle' ? input.outputTokens : null, reason: input.reason.trim(), evidence: input.evidence.trim() }
    const kind = input.action === 'settle' ? 'manual_settle' : 'manual_release'
    return this.locked(workspaceId, async (manager, account) => {
      const actor = await this.adminActor(manager, actorId)
      const prior = await this.adminReplay(manager, workspaceId, actorId, input.operationId, kind, payload)
      if (prior) return prior
      const row = await this.reservation(manager, workspaceId, reference)
      this.reviewable(row)
      const amount = this.resolutionAmount(row!, input)
      const held = BigInt(row!.amount_micros)
      this.sufficient(BigInt(account.available_micros) + held, amount)
      const before = { balance: this.mapBalance(account), reservation: row }
      const balance = await this.change(manager, workspaceId, account, input.action === 'settle' ? 'settle' : 'release', reference, input.action === 'settle' ? amount : held, held - amount, -held)
      const [updated] = await manager.query(`WITH changed AS (UPDATE billing_reservations
        SET status = $3, outcome = $3, settled_micros = $4, actual_micros = $5, input_tokens = $6, output_tokens = $7,
          review_reason = NULL, updated_at = now() WHERE workspace_id = $1 AND request_id = $2 RETURNING *) SELECT * FROM changed`,
      [workspaceId, reference, input.action === 'settle' ? 'settled' : 'released', input.action === 'settle' ? String(amount) : null, String(amount), input.action === 'settle' ? input.inputTokens : null, input.action === 'settle' ? input.outputTokens : null])
      const result = { operationId: input.operationId, workspaceId, balance, reservation: this.mapReservation(updated) }
      await this.adminAudit(manager, workspaceId, actor, input, kind, reference, payload, before, result)
      return result
    })
  }

  private reviewable(row: Reservation | undefined): void {
    if (!row) throw new NotFoundException('预占记录不存在')
    if (row.status !== 'held' || row.outcome !== 'review' || !row.parent_request_id) throw new ConflictException('仅待人工对账的未结预占可处置，请刷新记录')
  }

  private resolutionAmount(row: Reservation, input: Pick<BillingAdminResolutionInput, 'action' | 'inputTokens' | 'outputTokens'>): bigint {
    if (input.action === 'release') return 0n
    if (input.action !== 'settle' || !row.price_snapshot) throw new BadRequestException('缺少可信价格快照，无法结算')
    if (![input.inputTokens, input.outputTokens].every((value) => Number.isInteger(value) && value! >= 0 && value! <= 2147483647)) throw new BadRequestException('请输入已核实的 Token 用量')
    return chatSnapshotMicros(input.inputTokens!, input.outputTokens!, row.price_snapshot)
  }

  private adminInput(input: BillingAdminActionInput): void {
    if (!isUUID(input.operationId) || typeof input.reason !== 'string' || input.reason.trim().length < 5 || input.reason.length > 500 || typeof input.evidence !== 'string' || input.evidence.trim().length < 3 || input.evidence.length > 200) throw new BadRequestException('操作标识、原因或核实依据无效')
  }

  private async adminActor(manager: EntityManager, id: string): Promise<{ id: string; name: string }> {
    const [actor] = await manager.query('SELECT id, name, role, status FROM users WHERE id = $1 FOR SHARE', [id])
    if (!actor || actor.role !== 'admin' || actor.status !== 'active') throw new ForbiddenException('仅有效平台管理员可执行财务操作')
    return actor
  }

  private async adminReplay(manager: EntityManager, workspaceId: string, actorId: string, operationId: string, kind: string, payload: object): Promise<BillingAdminActionResult | undefined> {
    const [previous] = await manager.query(`SELECT actor_user_id, kind, payload = $3::jsonb AS matches, result
      FROM billing_admin_actions WHERE workspace_id = $1 AND operation_id = $2`, [workspaceId, operationId, JSON.stringify(payload)])
    if (!previous) return undefined
    if (previous.actor_user_id !== actorId || previous.kind !== kind || !previous.matches) throw new ConflictException('操作标识已使用，不能改变操作内容')
    return previous.result
  }

  private async adminAudit(manager: EntityManager, workspaceId: string, actor: { id: string; name: string }, input: BillingAdminActionInput, kind: string, reference: string | null, payload: object, before: object, result: BillingAdminActionResult): Promise<void> {
    await manager.query(`INSERT INTO billing_admin_actions (workspace_id, operation_id, kind, actor_user_id, actor_name, reason, evidence, reference, payload, before_state, result)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb)`, [workspaceId, input.operationId, kind, actor.id, actor.name, input.reason.trim(), input.evidence.trim(), reference, JSON.stringify(payload), JSON.stringify(before), JSON.stringify(result)])
  }

  async balance(workspaceId: string): Promise<BillingBalance> {
    const [account] = await this.source.query('SELECT available_micros, reserved_micros FROM billing_accounts WHERE workspace_id = $1', [workspaceId])
    return this.mapBalance(account ?? { available_micros: '0', reserved_micros: '0' })
  }

  async ledger(workspaceId: string, cursor?: string): Promise<BillingLedgerResponse> {
    if (cursor && (!/^[1-9]\d{0,18}$/.test(cursor) || BigInt(cursor) > 9_223_372_036_854_775_807n)) throw new BadRequestException('账本游标无效')
    const rows = await this.source.query(`SELECT * FROM billing_ledger WHERE workspace_id = $1
      AND ($2::bigint IS NULL OR id < $2::bigint) ORDER BY id DESC LIMIT 51`, [workspaceId, cursor ?? null])
    const page = rows.slice(0, 50)
    return {
      data: page.map((row: { id: string; kind: 'grant' | 'reserve' | 'settle' | 'release'; reference: string; amount_micros: string; available_delta: string; reserved_delta: string; available_after: string; reserved_after: string; created_at: Date }) => ({
        id: row.id, kind: row.kind, reference: row.reference, amount: fromMicros(row.amount_micros),
        availableDelta: fromMicros(row.available_delta), reservedDelta: fromMicros(row.reserved_delta),
        availableAfter: fromMicros(row.available_after), reservedAfter: fromMicros(row.reserved_after),
        createdAt: row.created_at.toISOString(),
      })),
      nextCursor: rows.length > 50 ? page.at(-1).id : null,
    }
  }

  /** Internal funding seam only; no public top-up or unverified payment callback. */
  async grant(workspaceId: string, reference: string, amount: string): Promise<BillingBalance> {
    this.reference(reference)
    const micros = toMicros(amount)
    if (micros === 0n) throw new BadRequestException('入账金额必须大于零')
    return this.locked(workspaceId, async (manager, account) => {
      const [previous] = await manager.query("SELECT amount_micros FROM billing_ledger WHERE workspace_id = $1 AND kind = 'grant' AND reference = $2", [workspaceId, reference])
      if (previous) {
        if (BigInt(previous.amount_micros) !== micros) throw new ConflictException('同一入账标识不能改变金额')
        return this.mapBalance(account)
      }
      return this.change(manager, workspaceId, account, 'grant', reference, micros, micros, 0n)
    })
  }

  async reserve(workspaceId: string, requestId: string, amount: string, chat?: { parentRequestId: string; priceSnapshot: RequestPriceSnapshot }): Promise<BillingReservation> {
    this.reference(requestId)
    const micros = toMicros(amount)
    return this.locked(workspaceId, async (manager, account) => {
      const previous = await this.reservation(manager, workspaceId, requestId)
      if (previous) {
        if (chat) throw new ConflictException('同一模型调用尝试不可重复提交')
        if (BigInt(previous.amount_micros) !== micros) throw new ConflictException('同一请求不能改变预占金额')
        return this.mapReservation(previous)
      }
      this.sufficient(BigInt(account.available_micros), micros)
      const [row] = await manager.query(`INSERT INTO billing_reservations (workspace_id, request_id, amount_micros, status)
        VALUES ($1, $2, $3, 'held') RETURNING *`, [workspaceId, requestId, String(micros)])
      if (chat) await manager.query(`UPDATE billing_reservations SET parent_request_id = $3, price_snapshot = $4::jsonb, outcome = 'prepared'
        WHERE workspace_id = $1 AND request_id = $2`, [workspaceId, requestId, chat.parentRequestId, JSON.stringify(chat.priceSnapshot)])
      await this.change(manager, workspaceId, account, 'reserve', requestId, micros, -micros, micros)
      return this.mapReservation(row)
    })
  }

  async settle(workspaceId: string, requestId: string, actual: string): Promise<BillingReservation> {
    this.reference(requestId)
    const spent = toMicros(actual)
    return this.locked(workspaceId, async (manager, account) => {
      const row = await this.reservation(manager, workspaceId, requestId)
      if (!row) throw new NotFoundException('预占记录不存在')
      if (row.status === 'settled') {
        if (BigInt(row.settled_micros!) !== spent) throw new ConflictException('同一请求不能改变结算金额')
        return this.mapReservation(row)
      }
      if (row.status !== 'held') throw new ConflictException('已释放的预占不可结算')
      const held = BigInt(row.amount_micros)
      // Excess usage can consume free balance, but can never consume another request's hold.
      this.sufficient(BigInt(account.available_micros) + held, spent)
      await this.change(manager, workspaceId, account, 'settle', requestId, spent, held - spent, -held)
      const [updated] = await manager.query(`WITH changed AS (
        UPDATE billing_reservations SET status = 'settled', settled_micros = $3, outcome = CASE WHEN parent_request_id IS NULL THEN NULL ELSE 'settled' END, updated_at = now()
        WHERE workspace_id = $1 AND request_id = $2 RETURNING *) SELECT * FROM changed`, [workspaceId, requestId, String(spent)])
      return this.mapReservation(updated)
    })
  }

  async release(workspaceId: string, requestId: string): Promise<BillingReservation> {
    this.reference(requestId)
    return this.locked(workspaceId, async (manager, account) => {
      const row = await this.reservation(manager, workspaceId, requestId)
      if (!row) throw new NotFoundException('预占记录不存在')
      if (row.status === 'released') return this.mapReservation(row)
      if (row.status !== 'held') throw new ConflictException('已结算的请求不可释放')
      const held = BigInt(row.amount_micros)
      await this.change(manager, workspaceId, account, 'release', requestId, held, held, -held)
      const [updated] = await manager.query(`WITH changed AS (
        UPDATE billing_reservations SET status = 'released', outcome = CASE WHEN parent_request_id IS NULL THEN NULL ELSE 'released' END, updated_at = now()
        WHERE workspace_id = $1 AND request_id = $2 RETURNING *) SELECT * FROM changed`, [workspaceId, requestId])
      return this.mapReservation(updated)
    })
  }

  private async locked<T>(workspaceId: string, work: (manager: EntityManager, account: Account) => Promise<T>): Promise<T> {
    return this.source.transaction(async (manager) => {
      await manager.query('INSERT INTO billing_accounts (workspace_id) SELECT id FROM workspaces WHERE id = $1 ON CONFLICT DO NOTHING', [workspaceId])
      const [account] = await manager.query('SELECT * FROM billing_accounts WHERE workspace_id = $1 FOR UPDATE', [workspaceId])
      if (!account) throw new NotFoundException('工作区不存在')
      return work(manager, account)
    })
  }

  private reservation(manager: EntityManager, workspaceId: string, requestId: string): Promise<Reservation | undefined> {
    return manager.query('SELECT * FROM billing_reservations WHERE workspace_id = $1 AND request_id = $2', [workspaceId, requestId]).then((rows) => rows[0])
  }

  private async change(manager: EntityManager, workspaceId: string, account: Account, kind: string, reference: string, amount: bigint, availableDelta: bigint, reservedDelta: bigint): Promise<BillingBalance> {
    const available = BigInt(account.available_micros) + availableDelta
    const reserved = BigInt(account.reserved_micros) + reservedDelta
    if (available < 0n || reserved < 0n || available > 9223372036854775807n || reserved > 9223372036854775807n) throw new BadRequestException('余额超出账户支持范围')
    await manager.query('UPDATE billing_accounts SET available_micros = $2, reserved_micros = $3, updated_at = now() WHERE workspace_id = $1', [workspaceId, String(available), String(reserved)])
    await manager.query(`INSERT INTO billing_ledger (workspace_id, kind, reference, amount_micros, available_delta, reserved_delta, available_after, reserved_after)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [workspaceId, kind, reference, String(amount), String(availableDelta), String(reservedDelta), String(available), String(reserved)])
    return this.mapBalance({ available_micros: String(available), reserved_micros: String(reserved) })
  }

  private sufficient(available: bigint, requested: bigint): void {
    if (available < requested) throw new HttpException('工作区可用额度不足，预占记录保持不变', 402)
  }

  private reference(value: string): void {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_.:-]{1,120}$/.test(value)) throw new BadRequestException('业务标识无效')
  }

  private mapBalance(account: Account): BillingBalance {
    return { currency: 'CNY', available: fromMicros(account.available_micros), reserved: fromMicros(account.reserved_micros) }
  }

  private mapReservation(row: Reservation): BillingReservation {
    return { requestId: row.request_id, status: row.status, reserved: fromMicros(row.amount_micros), settled: row.settled_micros === null ? null : fromMicros(row.settled_micros) }
  }
}
