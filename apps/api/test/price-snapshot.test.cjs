require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { chatSnapshotCost, chatSnapshotMicros } = require('../src/inference/price-snapshot')

test('fixed precision pricing rounds once, including zero and null output price', () => {
  const price = { priceUnit: 'million_tokens', inputPrice: '0.1000', outputPrice: null }
  assert.equal(chatSnapshotCost(5, 0, price), 0.000001)
  assert.equal(chatSnapshotCost(4, 100, price), 0)
  assert.equal(chatSnapshotCost(1000000, 1000000, { ...price, outputPrice: '0.2000' }), 0.3)
  assert.throws(() => chatSnapshotCost(-1, 0, price))
  assert.throws(() => chatSnapshotCost(1, 0, { ...price, priceUnit: 'second' }))
  assert.throws(() => chatSnapshotCost(1, 0, { ...price, inputPrice: '0.00001' }))
  assert.equal(chatSnapshotMicros(1000000001, 0, { ...price, inputPrice: '99999999.0001' }), 99999999100099999n)
})
