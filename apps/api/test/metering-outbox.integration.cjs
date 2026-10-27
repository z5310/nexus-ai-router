require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const source = require('../src/database/data-source').default
const { ApiKeyEntity } = require('../src/database/entities/api-key.entity')
const { WorkspaceModelEntity } = require('../src/database/entities/workspace-model.entity')
const { InferenceRepository } = require('../src/inference/inference.repository')
const { MeteringOutboxService } = require('../src/metering/metering-outbox.service')
const { ObservabilityService } = require('../src/observability/observability.service')

async function main() {
  await source.initialize()
  const requestIds = []
  const futureBuckets = ['2099-01-01T01:00:00.000Z', '2099-01-01T02:00:00.000Z']
  let queueAvailable = false
  const enqueued = []
  const queue = { add: async (_name, data) => {
    if (!queueAvailable) throw new Error('simulated redis outage')
    enqueued.push(data.eventId)
  } }
  const config = { get: (name, fallback) => name === 'METERING_OUTBOX_MAX_ATTEMPTS' ? 3 : fallback }
  const metrics = new ObservabilityService()
  const outbox = new MeteringOutboxService(source, queue, config, metrics)
  const repository = new InferenceRepository(source.getRepository(ApiKeyEntity), source.getRepository(WorkspaceModelEntity), source, outbox)
  try {
    const [workspace] = await source.query('SELECT id, created_by_user_id FROM workspaces ORDER BY created_at LIMIT 1')
    assert.ok(workspace, 'a migrated development workspace is required')
    const currentBucket = new Date(); currentBucket.setUTCMinutes(0, 0, 0)
    const [before] = await source.query('SELECT request_count FROM usage_buckets WHERE workspace_id = $1 AND bucket_start = $2', [workspace.id, currentBucket])

    const input = (requestId) => ({
      workspaceId: workspace.id, userId: workspace.created_by_user_id, requestId,
      requestedModelPublicId: 'deepseek-chat', modelPublicId: 'deepseek-chat', routeRuleId: null,
      status: 'success', latencyMs: 420, firstTokenLatencyMs: 120, errorCode: null,
      inputTokens: 30, outputTokens: 20, costCny: 0.000321,
      attempts: [{ modelPublicId: 'deepseek-chat', provider: 'deepseek', channelId: null, deploymentId: null,
        status: 'success', latencyMs: 400, errorCode: null, errorMessage: null }],
    })

    const firstRequestId = `metering-${randomUUID()}`
    requestIds.push(firstRequestId)
    await repository.record(input(firstRequestId))
    await new Promise((resolve) => setTimeout(resolve, 20))
    const [first] = await source.query(`SELECT event.id, event.aggregate_id FROM metering_outbox_events event
      JOIN request_logs request ON request.id = event.aggregate_id WHERE request.request_id = $1`, [firstRequestId])
    assert.ok(first, 'request log and outbox event commit together while Redis is unavailable')
    const [afterRecord] = await source.query('SELECT request_count FROM usage_buckets WHERE workspace_id = $1 AND bucket_start = $2', [workspace.id, currentBucket])
    assert.equal(afterRecord?.request_count ?? null, before?.request_count ?? null, 'request transaction does not directly mutate usage aggregation')

    await source.query("UPDATE metering_outbox_events SET payload = jsonb_set(payload, '{bucketStart}', to_jsonb($2::text)) WHERE id = $1", [first.id, futureBuckets[0]])
    queueAvailable = true
    await outbox.dispatchPending()
    assert.ok(enqueued.includes(first.id), 'database recovery scan republishes an event missed during Redis outage')

    const outcomes = await Promise.all([outbox.consume(first.id), outbox.consume(first.id)])
    assert.deepEqual(outcomes.sort(), ['duplicate', 'processed'])
    assert.equal(await outbox.consume(first.id), 'duplicate', 'confirmation loss and redelivery stay idempotent')
    const [bucket] = await source.query('SELECT request_count, token_count, cost_cny FROM usage_buckets WHERE workspace_id = $1 AND bucket_start = $2', [workspace.id, futureBuckets[0]])
    assert.equal(bucket.request_count, 1)
    assert.equal(Number(bucket.token_count), 50)
    assert.equal(Number(bucket.cost_cny), 0.0003)

    const rollbackRequestId = `metering-rollback-${randomUUID()}`
    const failingOutbox = { append: async () => { throw new Error('simulated outbox write failure') }, notify: () => {} }
    const failingRepository = new InferenceRepository(source.getRepository(ApiKeyEntity), source.getRepository(WorkspaceModelEntity), source, failingOutbox)
    await assert.rejects(failingRepository.record(input(rollbackRequestId)), /simulated outbox write failure/)
    const [rolledBack] = await source.query('SELECT id FROM request_logs WHERE request_id = $1', [rollbackRequestId])
    assert.equal(rolledBack, undefined, 'request log and attempts roll back if the outbox cannot be written')

    const secondRequestId = `metering-dead-${randomUUID()}`
    requestIds.push(secondRequestId)
    await repository.record(input(secondRequestId))
    const [second] = await source.query(`SELECT event.id, event.payload FROM metering_outbox_events event
      JOIN request_logs request ON request.id = event.aggregate_id WHERE request.request_id = $1`, [secondRequestId])
    const invalid = { ...second.payload, tokenCount: -1, bucketStart: futureBuckets[1] }
    await source.query('UPDATE metering_outbox_events SET payload = $2 WHERE id = $1', [second.id, invalid])
    assert.equal(await outbox.consume(second.id), 'failed')
    assert.equal(await outbox.consume(second.id), 'failed')
    assert.equal(await outbox.consume(second.id), 'dead_lettered')
    const dead = await outbox.list('dead', 20)
    assert.ok(dead.data.some((event) => event.id === second.id && event.attemptCount === 3))

    await source.query('UPDATE metering_outbox_events SET payload = $2 WHERE id = $1', [second.id, { ...invalid, tokenCount: 50 }])
    assert.deepEqual(await outbox.replay(second.id), { id: second.id, status: 'pending' })
    assert.equal(await outbox.consume(second.id), 'processed')
    const [replayedBucket] = await source.query('SELECT request_count FROM usage_buckets WHERE workspace_id = $1 AND bucket_start = $2', [workspace.id, futureBuckets[1]])
    assert.equal(replayedBucket.request_count, 1)

    const rendered = metrics.render()
    assert.match(rendered, /nexus_metering_events_total\{outcome="processed"\} 2/)
    assert.match(rendered, /nexus_metering_events_total\{outcome="duplicate"\} 2/)
    assert.match(rendered, /nexus_metering_events_total\{outcome="dead_lettered"\} 1/)
    console.log('PASS: transactional outbox survives Redis outage, consumes once across workers, dead-letters and replays safely')
  } finally {
    for (const bucket of futureBuckets) await source.query('DELETE FROM usage_buckets WHERE bucket_start = $1', [bucket])
    if (requestIds.length) await source.query('DELETE FROM request_logs WHERE request_id = ANY($1)', [requestIds])
    await source.destroy()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
