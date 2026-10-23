require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { DataSource } = require('typeorm')
const source = require('../src/database/data-source').default
const { BillingLedger1760000019000 } = require('../src/database/migrations/1760000019000-BillingLedger')
const { ChatBilling1760000020000 } = require('../src/database/migrations/1760000020000-ChatBilling')
const { BillingService } = require('../src/billing/billing.service')

async function main() {
  await source.initialize()
  // A separate schema allows real multi-connection concurrency and append-only verification.
  // No production/account/ledger rows are modified or deleted by this test.
  const schema = `billing_test_${randomUUID().replaceAll('-', '')}`
  assert.match(schema, /^billing_test_[a-f0-9]{32}$/)
  let isolated
  try {
    await source.query(`CREATE SCHEMA "${schema}"`)
    isolated = new DataSource({ ...source.options, extra: { options: `-c search_path=${schema},public`, max: 12 } })
    await isolated.initialize()
    const runner = isolated.createQueryRunner()
    try {
      await new BillingLedger1760000019000().up(runner)
      await new ChatBilling1760000020000().up(runner)
    } finally { await runner.release() }
    const [workspace] = await source.query('SELECT id FROM workspaces LIMIT 1')
    assert.ok(workspace, 'migrated development workspace required')
    const workspaceId = workspace.id
    const billing = new BillingService(isolated)
    await Promise.all(Array.from({ length: 5 }, () => billing.grant(workspaceId, 'funding-1', '10')))
    assert.equal((await billing.balance(workspaceId)).available, '10.000000')
    await assert.rejects(billing.grant(workspaceId, 'funding-1', '20'), { status: 409 })
    const attempts = await Promise.allSettled(Array.from({ length: 10 }, (_, index) => billing.reserve(workspaceId, `call-${index}`, '3')))
    assert.equal(attempts.filter((item) => item.status === 'fulfilled').length, 3)
    assert.ok(attempts.filter((item) => item.status === 'rejected').every((item) => item.reason.status === 402))
    assert.deepEqual(await billing.balance(workspaceId), { currency: 'CNY', available: '1.000000', reserved: '9.000000' })
    const held = attempts.filter((item) => item.status === 'fulfilled').map((item) => item.value)
    await Promise.all(Array.from({ length: 5 }, () => billing.settle(workspaceId, held[0].requestId, '2')))
    await assert.rejects(billing.settle(workspaceId, held[0].requestId, '1'), { status: 409 })
    await assert.rejects(billing.release(workspaceId, held[0].requestId), { status: 409 })
    for (const item of held.slice(1)) {
      await Promise.all([billing.release(workspaceId, item.requestId), billing.release(workspaceId, item.requestId)])
      await assert.rejects(billing.settle(workspaceId, item.requestId, '1'), { status: 409 })
    }
    assert.deepEqual(await billing.balance(workspaceId), { currency: 'CNY', available: '8.000000', reserved: '0.000000' })

    // Excess actual usage consumes only available credit; insufficient funds preserve the hold.
    await billing.reserve(workspaceId, 'overage', '1')
    await assert.rejects(billing.settle(workspaceId, 'overage', '20'), { status: 402 })
    assert.equal((await billing.balance(workspaceId)).reserved, '1.000000')
    await billing.settle(workspaceId, 'overage', '2')
    assert.equal((await billing.balance(workspaceId)).available, '6.000000')
    await billing.reserve(workspaceId, 'race', '2')
    const terminal = await Promise.allSettled([billing.settle(workspaceId, 'race', '1'), billing.release(workspaceId, 'race')])
    assert.equal(terminal.filter((item) => item.status === 'fulfilled').length, 1)
    assert.equal(terminal.find((item) => item.status === 'rejected').reason.status, 409)
    assert.equal((await billing.balance(workspaceId)).reserved, '0.000000')

    const otherWorkspace = randomUUID()
    assert.deepEqual(await billing.balance(otherWorkspace), { currency: 'CNY', available: '0.000000', reserved: '0.000000' })
    assert.deepEqual((await billing.ledger(otherWorkspace)).data, [])
    await assert.rejects(billing.release(otherWorkspace, held[0].requestId))
    for (let index = 0; index < 52; index++) await billing.grant(workspaceId, `micro-${index}`, '0.000001')
    const first = await billing.ledger(workspaceId)
    const second = await billing.ledger(workspaceId, first.nextCursor)
    assert.equal(first.data.length, 50)
    assert.ok(second.data.length > 0)
    assert.equal(new Set([...first.data, ...second.data].map((row) => row.id)).size, first.data.length + second.data.length)
    await assert.rejects(billing.ledger(workspaceId, 'bad-cursor'), { status: 400 })
    const [totals] = await isolated.query('SELECT sum(available_delta)::text AS available, sum(reserved_delta)::text AS reserved FROM billing_ledger WHERE workspace_id=$1', [workspaceId])
    const [account] = await isolated.query('SELECT * FROM billing_accounts WHERE workspace_id=$1', [workspaceId])
    assert.equal(totals.available, account.available_micros)
    assert.equal(totals.reserved, account.reserved_micros)
    await assert.rejects(isolated.query('UPDATE billing_ledger SET reference = reference'), /append-only/)
    await assert.rejects(isolated.query('DELETE FROM billing_ledger'), /append-only/)
    await assert.rejects(isolated.query('TRUNCATE billing_ledger'), /append-only/)
    console.log('PASS: concurrent no-overdraft holds, funding/settlement/release idempotency, terminal race, overage, tenant isolation, cursor pagination and immutable reconciled ledger')
  } finally {
    if (isolated?.isInitialized) await isolated.destroy()
    await source.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
    await source.destroy()
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
