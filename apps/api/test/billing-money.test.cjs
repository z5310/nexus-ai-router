require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { toMicros, fromMicros } = require('../src/billing/money')

test('money preserves micro-CNY without floating point or silent rounding', () => {
  assert.equal(toMicros('0.000001'), 1n)
  assert.equal(toMicros('999999999999.999999'), 999999999999999999n)
  assert.equal(fromMicros(toMicros('0.1') + toMicros('0.2')), '0.300000')
  assert.equal(fromMicros(-1n), '-0.000001')
  for (const value of ['-1', '1e3', '0.0000001', 'NaN', '', ' 1', '1000000000000', 1]) assert.throws(() => toMicros(value))
})
