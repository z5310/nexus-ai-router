require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const source = require('../src/database/data-source').default
const { InferenceRepository } = require('../src/inference/inference.repository')
const { InferenceService } = require('../src/inference/inference.service')
const { ModelPricingService } = require('../src/models/model-pricing.service')
const { ModelEntity } = require('../src/database/entities/model.entity')
const { RequestLogEntity } = require('../src/database/entities/request-log.entity')
const { ApiKeyEntity } = require('../src/database/entities/api-key.entity')
const { WorkspaceModelEntity } = require('../src/database/entities/workspace-model.entity')
const { InferenceAttemptEntity } = require('../src/database/entities/inference-attempt.entity')
const { UsageBucketEntity } = require('../src/database/entities/usage-bucket.entity')
const { DashboardRepository } = require('../src/dashboard/dashboard.repository')
const { DashboardService } = require('../src/dashboard/dashboard.service')

async function main() {
  await source.initialize()
  const runner = source.createQueryRunner()
  await runner.connect()
  await runner.startTransaction()
  try {
    // All price publications, logs and usage writes roll back together; no seed changes remain.
    const db = {
      query: (...args) => runner.query(...args),
      transaction: (work) => work(runner.manager),
      getRepository: (entity) => runner.manager.getRepository(entity),
    }
    const [workspace] = await db.query('SELECT id, created_by_user_id FROM workspaces LIMIT 1')
    const model = await db.getRepository(ModelEntity).findOneBy({ modelType: 'text' })
    assert.ok(workspace && model, 'migrated development fixtures required')
    const pricing = new ModelPricingService(db)
    const publish = (input) => pricing.publish(model.id, workspace.created_by_user_id, {
      originalInputPrice: input, originalOutputPrice: input * 2, discountPercent: 0, priceUnit: 'million_tokens',
    })
    const first = await publish(10)
    const testMetering = { append: async () => randomUUID(), notify: () => {} }
    const repository = new InferenceRepository(db.getRepository(ApiKeyEntity), db.getRepository(WorkspaceModelEntity), db, testMetering)
    const selected = { id: randomUUID(), model, rateLimitRpm: 60 }
    const key = { workspaceId: workspace.id, userId: workspace.created_by_user_id }
    const response = { id: 'test', object: 'chat.completion', created: 1, model: model.publicId, choices: [], usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 } }
    let releaseCount = 0
    const service = new InferenceService(repository, {
      chat: async () => { await publish(30); return response },
      streamChat: async () => ({
        cancel() {},
        chunks: (async function* () {
          await publish(50)
          yield { ...response, object: 'chat.completion.chunk' }
        })(),
      }),
    }, {
      consume: async () => {},
      acquireConcurrency: async () => ({ release: async () => { releaseCount++ } }),
    }, { get: (_name, fallback) => fallback }, {
      resolve: async () => ({ requested: selected, candidates: [selected], routeRuleId: null }),
    }, { resolveTargets: async () => [{ provider: 'test', model: model.publicId }], recordResult: async () => {} })
    const jsonId = `price-json-${randomUUID()}`
    await service.chat({ model: model.publicId, messages: [] }, key, jsonId)
    const log = await db.getRepository(RequestLogEntity).findOneByOrFail({ requestId: jsonId })
    assert.equal(log.priceSnapshot.versionId, first.versions[0].id)
    assert.equal(log.priceSnapshot.modelPublicId, model.publicId)
    assert.equal(log.priceSnapshot.modelName, model.name)
    assert.equal(log.priceSnapshot.providerName, model.owner)
    assert.equal(log.priceSnapshot.inputPrice, '10.0000')
    assert.equal(log.costCny, '0.002000')
    const streamId = `price-stream-${randomUUID()}`
    const stream = await service.streamChat({ model: model.publicId, messages: [] }, key, new AbortController().signal, streamId)
    for await (const chunk of stream.chunks) assert.ok(chunk)
    const streamLog = await db.getRepository(RequestLogEntity).findOneByOrFail({ requestId: streamId })
    assert.equal(streamLog.priceSnapshot.inputPrice, '30.0000')
    assert.equal(streamLog.costCny, '0.006000')
    assert.equal(releaseCount, 2)
    const dashboard = new DashboardService(new DashboardRepository(db.getRepository(UsageBucketEntity), db.getRepository(RequestLogEntity), db.getRepository(InferenceAttemptEntity)))
    const detail = await dashboard.requestDetail(workspace.id, jsonId)
    assert.deepEqual(detail.priceSnapshot, log.priceSnapshot)
    await assert.rejects(() => dashboard.requestDetail(randomUUID(), jsonId))
    assert.equal((await db.getRepository(RequestLogEntity).findOneByOrFail({ requestId: jsonId })).priceSnapshot.inputPrice, '10.0000')
    console.log('PASS: JSON/SSE price captured before upstream repricing, persisted with version, historical detail and tenant isolation')
  } finally {
    await runner.rollbackTransaction()
    await runner.release()
    await source.destroy()
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
