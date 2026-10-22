const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const code = ts.transpileModule(readFileSync(require('node:path').join(__dirname, '../src/refresh-session.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText

function load(navigator) {
  const context = { exports: {}, navigator }
  vm.runInNewContext(code, context)
  return context.exports.createSessionRefresh
}

test('same tab shares a pending refresh and retries after failure', async () => {
  let calls = 0
  const refresh = load(undefined)(async () => {
    if (++calls === 1) throw new Error('offline')
    return 'token'
  })
  const first = refresh()
  assert.equal(first, refresh())
  await assert.rejects(first, /offline/)
  assert.equal(await refresh(), 'token')
  assert.equal(calls, 2)
})

test('independent tabs serialize cookie rotation with the same named lock', async () => {
  let tail = Promise.resolve()
  const names = []
  const locks = { request(name, callback) {
    names.push(name)
    const next = tail.then(callback)
    tail = next.catch(() => {})
    return next
  } }
  let cookie = 0
  let active = 0
  let peak = 0
  const rotate = async () => {
    const original = cookie
    peak = Math.max(peak, ++active)
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(cookie, original, 'cookie cannot be rotated concurrently')
    cookie++
    active--
    return cookie
  }
  const firstTab = load({ locks })(rotate)
  const secondTab = load({ locks })(rotate)
  assert.deepEqual(await Promise.all([firstTab(), secondTab()]), [1, 2])
  assert.equal(peak, 1)
  assert.equal(new Set(names).size, 1)
})
