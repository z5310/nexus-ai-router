require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const { randomUUID, createHash } = require('node:crypto')
const source = require('../src/database/data-source').default
const { InferenceIdempotencyService } = require('../src/inference/inference-idempotency.service')

const hash = (value) => createHash('sha256').update(value).digest('hex')

async function main() {
  await source.initialize()
  await source.runMigrations()
  const [workspace] = await source.query('SELECT id FROM workspaces ORDER BY created_at LIMIT 1')
  assert.ok(workspace, '需要至少一个测试工作区')
  const service = new InferenceIdempotencyService(source)
  const prefix = `idem-test-${randomUUID()}`
  const keys = {
    replay: `${prefix}-replay`,
    pending: `${prefix}-pending`,
    failure: `${prefix}-failure`,
    expired: `${prefix}-expired`,
  }

  try {
    const payload = { model: 'test/model', messages: [{ role: 'user', content: 'hello' }], temperature: 0 }
    const response = { id: 'chatcmpl-idempotent', object: 'chat.completion', created: 1, model: 'test/model', choices: [], usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } }
    let calls = 0
    const firstRequestId = randomUUID()
    const first = await service.execute(workspace.id, keys.replay, payload, firstRequestId, async () => { calls++; return response })
    assert.deepEqual(first, { response, requestId: firstRequestId, replayed: false })

    const replay = await service.execute(workspace.id, keys.replay, { temperature: 0, messages: payload.messages, model: payload.model }, randomUUID(), async () => { calls++; return response })
    assert.equal(replay.replayed, true)
    assert.equal(replay.requestId, firstRequestId)
    assert.deepEqual(replay.response, response)
    assert.equal(calls, 1)
    await assert.rejects(
      service.execute(workspace.id, keys.replay, { ...payload, temperature: 1 }, randomUUID(), async () => response),
      { status: 409 },
    )

    let release
    const gate = new Promise((resolve) => { release = resolve })
    let concurrentCalls = 0
    const pendingRequestId = randomUUID()
    const running = service.execute(workspace.id, keys.pending, payload, pendingRequestId, async () => { concurrentCalls++; await gate; return response })
    for (let index = 0; index < 100; index++) {
      const [row] = await source.query('SELECT status FROM inference_idempotency WHERE workspace_id = $1 AND key_hash = $2', [workspace.id, hash(keys.pending)])
      if (row?.status === 'pending') break
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    await assert.rejects(
      service.execute(workspace.id, keys.pending, payload, randomUUID(), async () => { concurrentCalls++; return response }),
      (error) => error.status === 409 && error.message.includes(pendingRequestId),
    )
    release()
    await running
    assert.equal(concurrentCalls, 1)

    let failureCalls = 0
    const failureRequestId = randomUUID()
    await assert.rejects(service.execute(workspace.id, keys.failure, payload, failureRequestId, async () => { failureCalls++; throw new Error('upstream uncertain') }))
    await assert.rejects(
      service.execute(workspace.id, keys.failure, payload, randomUUID(), async () => { failureCalls++; return response }),
      (error) => error.status === 409 && error.message.includes(failureRequestId),
    )
    assert.equal(failureCalls, 1)

    const expiredRequestId = randomUUID()
    await service.execute(workspace.id, keys.expired, payload, expiredRequestId, async () => response)
    await source.query("UPDATE inference_idempotency SET expires_at = now() - interval '1 second' WHERE workspace_id = $1 AND key_hash = $2", [workspace.id, hash(keys.expired)])
    const renewedRequestId = randomUUID()
    const renewed = await service.execute(workspace.id, keys.expired, { ...payload, temperature: 0.5 }, renewedRequestId, async () => response)
    assert.equal(renewed.replayed, false)
    assert.equal(renewed.requestId, renewedRequestId)

    const [stored] = await source.query('SELECT key_hash FROM inference_idempotency WHERE workspace_id = $1 AND key_hash = $2', [workspace.id, hash(keys.replay)])
    assert.equal(stored.key_hash, hash(keys.replay))
    assert.notEqual(stored.key_hash, keys.replay)
    assert.equal(stored.key_hash.length, 64)
    console.log('PASS: Chat 幂等键重放、载荷冲突、并发保护、失败保护、过期复用与哈希存储')
  } finally {
    await source.query('DELETE FROM inference_idempotency WHERE workspace_id = $1 AND key_hash = ANY($2::varchar[])', [workspace.id, Object.values(keys).map(hash)])
    await source.destroy()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
