const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const context = { exports: {}, URL }
vm.runInNewContext(ts.transpileModule(readFileSync(require('node:path').join(__dirname, '../src/lib/redirect.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context)
const { safeRedirect } = context.exports
test('return to original page including query and hash', () => {
  assert.equal(safeRedirect('/models?type=text#list'), '/models?type=text#list')
  assert.equal(safeRedirect('/console/keys'), '/console/keys')
})
test('reject external destinations and authentication loops', () => {
  for (const value of ['https://evil.invalid', '//evil.invalid', '/\\evil.invalid', '/login?redirect=/login', '/auth/callback', null, ['//evil.invalid']]) assert.equal(safeRedirect(value), '/console')
})
