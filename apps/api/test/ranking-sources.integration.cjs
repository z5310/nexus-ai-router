require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const source = require('../src/database/data-source').default
const { ModelEntity } = require('../src/database/entities/model.entity')
const { RankingSourceEntity } = require('../src/database/entities/ranking-source.entity')
const { ModelBenchmarkMappingEntity } = require('../src/database/entities/model-benchmark-mapping.entity')
const { BenchmarkSnapshotEntity } = require('../src/database/entities/benchmark-snapshot.entity')
const { ModelsRepository } = require('../src/models/models.repository')
const { ModelsService } = require('../src/models/models.service')
const { HuggingFaceLeaderboardClient } = require('../src/rankings/hugging-face-leaderboard.client')
const { RankingSourcesRepository } = require('../src/rankings/ranking-sources.repository')
const { RankingSourcesService } = require('../src/rankings/ranking-sources.service')

async function verifyHuggingFaceCompatibility() {
  const originalFetch = global.fetch
  global.fetch = async () => ({
    ok: true,
    json: async () => [
      { rank: 1, modelId: 'vendor/current-shape', value: 92.5, verified: true, author: { name: 'vendor' } },
      { rank: 2, model_id: 'vendor/legacy-shape', value: 88, verified: false, author: 'legacy' },
    ],
  })
  try {
    const rows = await new HuggingFaceLeaderboardClient().fetch('org/benchmark')
    assert.deepEqual(rows.map((row) => row.modelId), ['vendor/current-shape', 'vendor/legacy-shape'])
  } finally {
    global.fetch = originalFetch
  }
}

async function main() {
  await verifyHuggingFaceCompatibility()
  await source.initialize()
  let createdId
  try {
    const [actor] = await source.query("SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1")
    const model = await source.getRepository(ModelEntity).findOne({ where: { isEnabled: true }, order: { createdAt: 'ASC' } })
    assert.ok(actor, 'an admin user is required')
    assert.ok(model, 'a seeded model is required')

    const repository = new RankingSourcesRepository(
      source.getRepository(RankingSourceEntity),
      source.getRepository(ModelBenchmarkMappingEntity),
      source.getRepository(BenchmarkSnapshotEntity),
      source,
    )
    const externalModelId = `fixture/${model.publicId}`
    const client = { fetch: async () => [{ rank: 1, modelId: externalModelId, value: 97.25, verified: true, author: 'fixture' }] }
    const rankings = new RankingSourcesService(repository, client, source.getRepository(ModelEntity))
    const created = await rankings.create(actor.id, {
      code: `fixture-${Date.now()}`,
      name: '测试公开榜单',
      adapter: 'huggingface',
      datasetId: 'fixture/benchmark',
      metric: 'coding',
      scoreMultiplier: 1,
      priority: 1,
      enabled: false,
      attributionLabel: 'Fixture · Public benchmark',
    })
    createdId = created.id

    const synced = await rankings.sync(created.id)
    assert.equal(synced.snapshots.length, 1)
    assert.equal(synced.snapshots[0].normalizedScore, 97.25)
    assert.equal(synced.source.lastError, null)

    const mapped = await rankings.mapModel(created.id, { modelId: model.id, externalModelId })
    assert.equal(mapped.snapshots[0].mappedModelId, model.id)
    assert.ok(mapped.snapshots[0].mappingId)
    await rankings.update(created.id, { enabled: true })

    const models = new ModelsService(new ModelsRepository(source.getRepository(ModelEntity)), {}, rankings)
    const response = await models.rankings({ metric: 'coding', limit: 100 })
    const rankedModel = response.data.find((item) => item.id === model.id)
    assert.ok(rankedModel, 'mapped model must remain in the ranking response')
    assert.equal(rankedModel.metricScore, 97.25)
    assert.equal(rankedModel.scoreSource.code, created.code)
    assert.equal(rankedModel.scoreSource.name, 'Fixture · Public benchmark')
    assert.equal(rankedModel.scoreSource.external, true)
    assert.ok(response.sources.some((item) => item.code === created.code))

    await rankings.remove(created.id)
    createdId = undefined
    console.log('PASS: ranking sources sync, map, attribute, and override public ranking scores')
  } finally {
    if (createdId) await source.query('DELETE FROM ranking_sources WHERE id = $1', [createdId])
    await source.destroy()
  }
}

main().catch((error) => {
  console.error('Ranking source integration failed; check PostgreSQL and migrations.', error)
  process.exitCode = 1
})
