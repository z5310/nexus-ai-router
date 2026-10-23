require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const source = require('../src/database/data-source').default
const { ModelEntity } = require('../src/database/entities/model.entity')
const { ModelsRepository } = require('../src/models/models.repository')
const { ModelsService } = require('../src/models/models.service')

async function main() {
  await source.initialize()
  try {
    const repository = new ModelsRepository(source.getRepository(ModelEntity))
    const service = new ModelsService(repository, {})
    const catalog = await service.list({ page: 1, pageSize: 100, sort: 'recommended' })
    assert.ok(catalog.data.length > 0, 'catalog must be seeded in the database')
    assert.equal(catalog.pagination.total, catalog.data.length)
    assert.ok(Object.keys(catalog.facets.providers).length > 0, 'provider facets must come from persisted models')

    const detail = await service.detail(catalog.data[0].slug)
    assert.equal(detail.id, catalog.data[0].id)

    const ranking = await service.rankings({ metric: 'overall', limit: 100 })
    assert.equal(ranking.data.length, catalog.data.length)
    assert.ok(ranking.data.every((item) => Number.isInteger(item.calls7d) && item.calls7d >= 0))
    assert.ok(ranking.data.every((item) => item.usageShare >= 0 && item.usageShare <= 100))
    assert.deepEqual(ranking.data.map((item) => item.rank), ranking.data.map((_, index) => index + 1))
    assert.ok(ranking.data.every((item, index, rows) => index === 0 || rows[index - 1].metricScore >= item.metricScore))
    console.log('PASS: catalog, detail, facets and ranking activity are loaded from PostgreSQL')
  } finally {
    await source.destroy()
  }
}

main().catch((error) => {
  console.error('Catalog integration failed; check PostgreSQL and migrations.', error)
  process.exitCode = 1
})
