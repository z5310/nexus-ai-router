require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const source = require('../src/database/data-source').default
const { ModelPricingService } = require('../src/models/model-pricing.service')
const { ModelEntity } = require('../src/database/entities/model.entity')
const { ModelsRepository } = require('../src/models/models.repository')
const { ModelsService } = require('../src/models/models.service')

async function main() {
  await source.initialize()
  let snapshot
  let previousActiveId
  let publishedId
  try {
    const model = await source.getRepository(ModelEntity).findOne({ where: {} })
    assert.ok(model, 'a seeded model is required')
    const [actor] = await source.query("SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1")
    assert.ok(actor, 'an admin user is required')
    snapshot = {
      id: model.id,
      inputPrice: model.inputPrice,
      outputPrice: model.outputPrice,
      originalInputPrice: model.originalInputPrice,
      originalOutputPrice: model.originalOutputPrice,
      discountPercent: model.discountPercent,
      priceUnit: model.priceUnit,
      priceEffectiveFrom: model.priceEffectiveFrom,
    }
    const [previousActive] = await source.query('SELECT id FROM model_price_versions WHERE model_id = $1 AND effective_to IS NULL', [model.id])
    previousActiveId = previousActive?.id

    const pricing = new ModelPricingService(source)
    const result = await pricing.publish(model.id, actor.id, {
      originalInputPrice: 12,
      originalOutputPrice: 24,
      discountPercent: 25,
      priceUnit: 'million_tokens',
    })
    publishedId = result.versions[0].id
    assert.equal(result.inputPrice, 9)
    assert.equal(result.outputPrice, 18)
    assert.equal(result.originalInputPrice, 12)
    assert.equal(result.originalOutputPrice, 24)
    assert.equal(result.discountPercent, 25)
    assert.equal(result.versions[0].effectiveTo, null)
    assert.ok(result.versions.some((version) => version.id === previousActiveId && version.effectiveTo !== null))

    const catalog = new ModelsService(new ModelsRepository(source.getRepository(ModelEntity)), {}, {})
    const publicModel = await catalog.detail(model.publicId)
    assert.equal(publicModel.inputPrice, 9)
    assert.equal(publicModel.originalInputPrice, 12)
    assert.equal(publicModel.discountPercent, 25)
    console.log('PASS: admin pricing publication creates history and updates the public catalog projection')
  } finally {
    if (snapshot) {
      if (publishedId) await source.query('DELETE FROM model_price_versions WHERE id = $1', [publishedId])
      if (previousActiveId) await source.query('UPDATE model_price_versions SET effective_to = NULL WHERE id = $1', [previousActiveId])
      await source.query(`
        UPDATE models SET input_price = $2, output_price = $3, original_input_price = $4,
          original_output_price = $5, discount_percent = $6, price_unit = $7, price_effective_from = $8
        WHERE id = $1
      `, [snapshot.id, snapshot.inputPrice, snapshot.outputPrice, snapshot.originalInputPrice, snapshot.originalOutputPrice, snapshot.discountPercent, snapshot.priceUnit, snapshot.priceEffectiveFrom])
    }
    await source.destroy()
  }
}

main().catch((error) => {
  console.error('Model pricing integration failed; check PostgreSQL and migrations.', error)
  process.exitCode = 1
})
