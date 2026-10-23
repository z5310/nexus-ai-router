require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { DataSource } = require('typeorm')
const { GatewayTimeoutException } = require('@nestjs/common')
const source = require('../src/database/data-source').default
const { BillingLedger1760000019000 } = require('../src/database/migrations/1760000019000-BillingLedger')
const { ChatBilling1760000020000 } = require('../src/database/migrations/1760000020000-ChatBilling')
const { BillingService } = require('../src/billing/billing.service')
const { ChatBillingService } = require('../src/billing/chat-billing.service')
const { InferenceService } = require('../src/inference/inference.service')
const { ProviderNotDispatchedException } = require('../src/inference/provider-gateway')

async function main() {
  await source.initialize()
  const schema = `chat_billing_test_${randomUUID().replaceAll('-', '')}`
  assert.match(schema, /^chat_billing_test_[a-f0-9]{32}$/)
  let db
  try {
    await source.query(`CREATE SCHEMA "${schema}"`)
    db = new DataSource({ ...source.options, extra: { options: `-c search_path=${schema},public`, max: 12 } })
    await db.initialize()
    const runner = db.createQueryRunner()
    try { await new BillingLedger1760000019000().up(runner); await new ChatBilling1760000020000().up(runner) }
    finally { await runner.release() }
    const [workspace] = await source.query('SELECT id, created_by_user_id FROM workspaces LIMIT 1')
    assert.ok(workspace)
    const workspaceId = workspace.id
    let enabled = false
    const billing = new BillingService(db)
    const chatBilling = new ChatBillingService(db, billing, { get: () => enabled ? workspaceId : '' })
    const price = { versionId: randomUUID(), modelId: randomUUID(), currency: 'CNY', priceUnit: 'million_tokens', inputPrice: '1.0000', outputPrice: '2.0000', originalInputPrice: '1.0000', originalOutputPrice: '2.0000', discountPercent: '0.00', effectiveFrom: new Date().toISOString() }
    let selectedPrice = price
    const model = { id: randomUUID(), model: { id: price.modelId, publicId: 'test/model' }, rateLimitRpm: 60 }
    const records = []
    let calls = 0
    let maxTokens
    let leases = 0
    const usage = { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
    let behavior = 'success'
    const provider = {
      chat: async (input, target) => {
        calls++; maxTokens = input.max_tokens
        if (behavior === 'unsent') throw new ProviderNotDispatchedException('not configured')
        if (behavior === 'timeout') throw new GatewayTimeoutException()
        if (behavior === 'fallback' && target.provider === 'first') throw new GatewayTimeoutException()
        return { choices: [], usage }
      },
      streamChat: async () => {
        calls++
        const mode = behavior
        return { cancel() {}, chunks: (async function* () {
          yield { choices: [] }
          if (mode !== 'no-usage') yield { choices: [], usage }
          if (mode === 'stream-error') throw new GatewayTimeoutException()
        })() }
      },
    }
    const service = new InferenceService({ capturePrice: async () => selectedPrice, record: async (input) => records.push(input) }, provider,
      { consume: async () => {}, acquireConcurrency: async () => { leases++; return { release: async () => { leases-- } } } },
      { get: (_key, fallback) => fallback }, { resolve: async () => ({ requested: model, candidates: [model], routeRuleId: null }) },
      { resolveTargets: async () => behavior === 'fallback' ? [{ provider: 'first' }, { provider: 'second' }] : [{ provider: 'test' }], recordResult: async () => {} }, chatBilling)
    const input = { model: 'test/model', messages: [{ role: 'user', content: 'hello' }] }
    const key = { workspaceId, userId: workspace.created_by_user_id }
    const row = async (id) => (await db.query('SELECT * FROM billing_reservations WHERE workspace_id = $1 AND request_id = $2', [workspaceId, `${id}:1`]))[0]
    await service.chat(input, key, 'disabled')
    assert.equal(maxTokens, undefined)
    assert.equal(await row('disabled'), undefined)
    enabled = true
    await billing.grant(workspaceId, 'test-funds', '10')
    await service.chat(input, key, 'json')
    assert.equal(maxTokens, 2048)
    assert.equal((await row('json')).status, 'settled')
    assert.equal((await row('json')).settled_micros, '50')
    assert.equal((await row('json')).price_snapshot.versionId, price.versionId)
    assert.equal((await billing.balance(workspaceId)).available, '9.999950')
    const beforeDuplicate = calls
    await assert.rejects(service.chat(input, key, 'json'), { status: 409 })
    assert.equal(calls, beforeDuplicate)
    selectedPrice = { ...price, outputPrice: '99999999.0000' }
    await assert.rejects(service.chat(input, key, 'insufficient'), { status: 402 })
    assert.equal(calls, beforeDuplicate)
    selectedPrice = price
    behavior = 'unsent'
    await assert.rejects(service.chat(input, key, 'unsent'))
    assert.equal((await row('unsent')).status, 'released')
    behavior = 'timeout'
    await assert.rejects(service.chat(input, key, 'timeout'))
    assert.equal((await row('timeout')).outcome, 'review')
    assert.equal((await row('timeout')).status, 'held')
    behavior = 'fallback'
    await service.chat(input, key, 'fallback')
    assert.equal((await row('fallback')).outcome, 'review')
    const [fallbackSuccess] = await db.query("SELECT * FROM billing_reservations WHERE request_id = 'fallback:2'")
    assert.equal(fallbackSuccess.status, 'settled')
    assert.equal(records.at(-1).attempts.length, 2)
    behavior = 'success'
    const stream = await service.streamChat(input, key, new AbortController().signal, 'sse')
    for await (const chunk of stream.chunks) assert.ok(chunk)
    assert.equal((await row('sse')).status, 'settled')
    assert.equal((await row('sse')).settled_micros, '50')
    behavior = 'no-usage'
    const noUsage = await service.streamChat(input, key, new AbortController().signal, 'no-usage')
    for await (const chunk of noUsage.chunks) assert.ok(chunk)
    assert.equal((await row('no-usage')).outcome, 'review')
    behavior = 'stream-error'
    const failed = await service.streamChat(input, key, new AbortController().signal, 'stream-error')
    await assert.rejects(async () => { for await (const chunk of failed.chunks) assert.ok(chunk) })
    assert.equal((await row('stream-error')).outcome, 'review')
    behavior = 'success'
    const cancelled = await service.streamChat(input, key, new AbortController().signal, 'cancelled')
    for await (const chunk of cancelled.chunks) { assert.ok(chunk); break }
    assert.equal((await row('cancelled')).outcome, 'review')
    assert.equal(leases, 0)

    // Cancellation before iteration still persists the unresolved upstream dispatch.
    const unconsumed = await service.streamChat(input, key, new AbortController().signal, 'unconsumed')
    unconsumed.cancel()
    for (let index = 0; index < 100 && (await row('unconsumed')).outcome !== 'review'; index++) await new Promise((resolve) => setTimeout(resolve, 10))
    assert.equal((await row('unconsumed')).outcome, 'review')
    assert.equal(leases, 0)

    // A crash between outcome persistence and deduction is recovered exactly once.
    const settle = billing.settle.bind(billing)
    billing.settle = async () => { throw new Error('simulated database interruption') }
    await service.chat(input, key, 'recover')
    assert.equal((await row('recover')).outcome, 'settle')
    assert.equal((await row('recover')).status, 'held')
    billing.settle = settle
    await chatBilling.reconcile(); await chatBilling.reconcile()
    assert.equal((await row('recover')).status, 'settled')
    const [settlementCount] = await db.query("SELECT count(*)::int AS n FROM billing_ledger WHERE kind = 'settle' AND reference = 'recover:1'")
    assert.equal(settlementCount.n, 1)
    await billing.reserve(workspaceId, 'stale-prepared:1', '0.1', { parentRequestId: 'stale-prepared', priceSnapshot: price })
    await chatBilling.begin(workspaceId, 'stale-dispatched', 1, price, input)
    await db.query("UPDATE billing_reservations SET updated_at = now() - interval '20 minutes' WHERE request_id IN ('stale-prepared:1','stale-dispatched:1')")
    await chatBilling.reconcile()
    assert.equal((await row('stale-prepared')).status, 'released')
    assert.equal((await row('stale-dispatched')).outcome, 'review')
    assert.equal((await row('stale-dispatched')).status, 'held')
    const excess = await chatBilling.begin(workspaceId, 'excess', 1, price, input)
    await chatBilling.finish(excess, true, { prompt_tokens: 20000000, completion_tokens: 20000000 })
    assert.equal((await row('excess')).outcome, 'settle')
    assert.equal((await row('excess')).status, 'held')
    await chatBilling.reconcile()
    assert.equal((await row('excess')).review_reason, 'settlement_funds_insufficient')
    await billing.grant(workspaceId, 'excess-funds', '100')
    await chatBilling.reconcile(); await chatBilling.reconcile()
    assert.equal((await row('excess')).status, 'settled')
    assert.equal((await row('excess')).settled_micros, '60000000')
    const pending = await chatBilling.pending(workspaceId)
    assert.ok(pending.data.some((item) => item.requestId === 'timeout' && item.actual === null))
    assert.deepEqual((await chatBilling.pending(randomUUID())).data, [])
    console.log('PASS: opt-in JSON/SSE billing, preflight 402, duplicate protection, safe release, ambiguous holds, cancellation, persistent recovery and pending isolation')
  } finally {
    if (db?.isInitialized) await db.destroy()
    await source.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
    await source.destroy()
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
