require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { DataSource } = require('typeorm')
const source = require('../src/database/data-source').default
const { BillingLedger1760000019000 } = require('../src/database/migrations/1760000019000-BillingLedger')
const { ChatBilling1760000020000 } = require('../src/database/migrations/1760000020000-ChatBilling')
const { BillingAdminAudit1760000021000 } = require('../src/database/migrations/1760000021000-BillingAdminAudit')
const { BillingService } = require('../src/billing/billing.service')
const { AdminBillingService } = require('../src/billing/admin-billing.service')
const { ChatBillingService } = require('../src/billing/chat-billing.service')

async function main() {
  await source.initialize()
  const schema = `admin_billing_test_${randomUUID().replaceAll('-', '')}`
  assert.match(schema, /^admin_billing_test_[a-f0-9]{32}$/)
  let db
  try {
    await source.query(`CREATE SCHEMA "${schema}"`)
    db = new DataSource({ ...source.options, extra: { options: `-c search_path=${schema},public`, max: 12 } })
    await db.initialize()
    const runner = db.createQueryRunner()
    try {
      for (const Migration of [BillingLedger1760000019000, ChatBilling1760000020000, BillingAdminAudit1760000021000]) await new Migration().up(runner)
    } finally { await runner.release() }
    const [workspace] = await source.query('SELECT id FROM workspaces LIMIT 1')
    const [actor] = await source.query("SELECT id FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1")
    const [viewer] = await source.query("SELECT id FROM users WHERE role <> 'admin' LIMIT 1")
    assert.ok(workspace && actor && viewer)
    const id = workspace.id
    const billing = new BillingService(db)
    const input = { operationId: randomUUID(), amount: '10', reason: 'isolated credit test', evidence: 'ticket-test-1' }
    const receipts = await Promise.all(Array.from({ length: 5 }, () => billing.adminGrant(id, actor.id, input)))
    for (const receipt of receipts) assert.deepEqual(receipt, receipts[0])
    assert.equal((await billing.balance(id)).available, '10.000000')
    await assert.rejects(billing.adminGrant(id, actor.id, { ...input, amount: '20' }), { status: 409 })
    await assert.rejects(billing.adminGrant(id, viewer.id, { ...input, operationId: randomUUID() }), { status: 403 })
    await assert.rejects(billing.adminGrant(id, actor.id, { ...input, operationId: randomUUID(), amount: '0' }), { status: 400 })
    await assert.rejects(billing.adminGrant(randomUUID(), actor.id, { ...input, operationId: randomUUID() }), { status: 404 })
    // An audit failure must roll back the balance and ledger posting too.
    await db.query("ALTER TABLE billing_admin_actions ADD CONSTRAINT test_reject CHECK (reason <> 'rollback test reason')")
    await assert.rejects(billing.adminGrant(id, actor.id, { ...input, operationId: randomUUID(), reason: 'rollback test reason' }))
    assert.equal((await billing.balance(id)).available, '10.000000')
    await db.query('ALTER TABLE billing_admin_actions DROP CONSTRAINT test_reject')
    const price = { versionId: randomUUID(), modelId: randomUUID(), currency: 'CNY', priceUnit: 'million_tokens', inputPrice: '1.0000', outputPrice: '2.0000', originalInputPrice: '1.0000', originalOutputPrice: '2.0000', discountPercent: '0', effectiveFrom: new Date().toISOString() }
    const prepare = async (reference, outcome = 'review') => {
      await billing.reserve(id, reference, '1', { parentRequestId: 'manual-parent', priceSnapshot: price })
      await db.query('UPDATE billing_reservations SET outcome = $2 WHERE workspace_id = $1 AND request_id = $3', [id, outcome, reference])
    }
    const resolution = { operationId: randomUUID(), action: 'settle', inputTokens: 100, outputTokens: 50, reason: 'verified provider usage', evidence: 'upstream-request-1' }
    await prepare('manual-1')
    const preview = await billing.previewResolution(id, 'manual-1', resolution)
    assert.equal(preview.amount, '0.000200')
    assert.equal(preview.availableAfter, '9.999800')
    assert.equal((await billing.balance(id)).reserved, '1.000000')
    const settled = await billing.adminResolve(id, actor.id, 'manual-1', resolution)
    assert.equal(settled.reservation.status, 'settled')
    assert.deepEqual(await billing.adminResolve(id, actor.id, 'manual-1', resolution), settled)
    await assert.rejects(billing.adminResolve(id, actor.id, 'manual-1', { ...resolution, operationId: randomUUID() }), { status: 409 })
    await prepare('active', 'dispatched')
    await assert.rejects(billing.adminResolve(id, actor.id, 'active', { ...resolution, operationId: randomUUID() }), { status: 409 })
    await prepare('race')
    const outcomes = await Promise.allSettled([
      billing.adminResolve(id, actor.id, 'race', { ...resolution, operationId: randomUUID() }),
      billing.adminResolve(id, actor.id, 'race', { ...resolution, operationId: randomUUID(), action: 'release' }),
    ])
    assert.equal(outcomes.filter((item) => item.status === 'fulfilled').length, 1)
    assert.equal(outcomes.find((item) => item.status === 'rejected').reason.status, 409)
    await prepare('excess')
    await assert.rejects(billing.adminResolve(id, actor.id, 'excess', { ...resolution, operationId: randomUUID(), inputTokens: 1000000000 }), { status: 402 })
    const [stillHeld] = await db.query("SELECT status FROM billing_reservations WHERE request_id = 'excess'")
    assert.equal(stillHeld.status, 'held')
    const [counts] = await db.query('SELECT count(*)::int AS n FROM billing_admin_actions')
    assert.equal(counts.n, 3)
    const admin = new AdminBillingService(db, billing, new ChatBillingService(db, billing, { get: () => '' }))
    const detail = await admin.detail(id)
    assert.equal(detail.audit.length, 3)
    assert.equal(detail.audit.find((item) => item.operationId === input.operationId).actorUserId, actor.id)
    await assert.rejects(db.query('UPDATE billing_admin_actions SET reason = reason'), /append-only/)
    await assert.rejects(db.query('DELETE FROM billing_admin_actions'), /append-only/)
    await assert.rejects(db.query('TRUNCATE billing_admin_actions'), /append-only/)
    console.log('PASS: atomic audited credit, replay protection, admin authorization, manual snapshot settlement, review-only resolution, concurrency and immutable audit')
  } finally {
    if (db?.isInitialized) await db.destroy()
    await source.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
    await source.destroy()
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
