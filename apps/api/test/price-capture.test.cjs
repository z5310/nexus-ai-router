require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { InferenceService } = require('../src/inference/inference.service')

test('chat and SSE keep captured prices when publication changes during upstream work', async () => {
  let current = {
    versionId: 'version-1', modelId: 'model-1', currency: 'CNY', priceUnit: 'million_tokens',
    inputPrice: '10.0000', outputPrice: '20.0000', originalInputPrice: '10.0000',
    originalOutputPrice: '20.0000', discountPercent: '0.00', effectiveFrom: '2026-10-23T00:00:00.000Z',
  }
  const records = []
  let leases = 0
  const selected = { model: { id: 'model-1', publicId: 'test/model' }, rateLimitRpm: 60 }
  const usage = { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
  const reprice = () => { current = { ...current, versionId: 'version-2', inputPrice: '30.0000', outputPrice: '60.0000' } }
  const provider = {
    chat: async () => { reprice(); return { usage, choices: [] } },
    streamChat: async () => ({
      cancel() {},
      chunks: (async function* () { reprice(); yield { choices: [], usage } })(),
    }),
  }
  const service = new InferenceService({
    capturePrice: async () => structuredClone(current),
    record: async (record) => records.push(structuredClone(record)),
  }, provider, {
    consume: async () => {}, acquireConcurrency: async () => { leases++; return { release: async () => { leases-- } } },
  }, { get: (_key, fallback) => fallback }, {
    resolve: async () => ({ requested: selected, candidates: [selected], routeRuleId: null }),
  }, { resolveTargets: async () => [{ provider: 'test' }], recordResult: async () => {} })
  const key = { workspaceId: 'workspace', userId: 'user' }
  await service.chat({ model: 'test/model' }, key)
  assert.equal(records[0].priceSnapshot.versionId, 'version-1')
  assert.equal(records[0].costCny, 0.002)
  current = { ...current, versionId: 'version-1', inputPrice: '10.0000', outputPrice: '20.0000' }
  const stream = await service.streamChat({ model: 'test/model' }, key, new AbortController().signal)
  for await (const chunk of stream.chunks) assert.ok(chunk)
  assert.equal(records[1].priceSnapshot.versionId, 'version-1')
  assert.equal(records[1].costCny, 0.002)
  assert.equal(leases, 0)

  provider.chat = async () => { throw new Error('upstream failure') }
  await assert.rejects(service.chat({ model: 'test/model' }, key))
  assert.equal(records[2].status, 'failed')
  assert.equal(records[2].costCny, 0)
  assert.equal(records[2].priceSnapshot.versionId, 'version-2')
  assert.equal(leases, 0)
})
