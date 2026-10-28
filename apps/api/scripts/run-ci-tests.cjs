const { spawnSync } = require('node:child_process')
const { readdirSync } = require('node:fs')

const tests = [
  'billing-money.test.cjs',
  'price-snapshot.test.cjs',
  'price-capture.test.cjs',
  'provider-usage.test.cjs',
  'ip-policy.test.cjs',
  'trusted-proxy.test.cjs',
  'observability.test.cjs',
  'catalog.integration.cjs',
  'model-pricing.integration.cjs',
  'providers.integration.cjs',
  'provider-routing.integration.cjs',
  'provider-data-plane.integration.cjs',
  'ranking-sources.integration.cjs',
  'member-management.integration.cjs',
  'member-key-race.integration.cjs',
  'workspace-permissions.integration.cjs',
  'workspace-invitations.integration.cjs',
  'workspace-invitations-http.integration.cjs',
  'access-revocation.integration.cjs',
  'session-rotation.integration.cjs',
  'traffic-control.integration.cjs',
  'inference-concurrency.integration.cjs',
  'inference-idempotency.integration.cjs',
  'routing-execution.integration.cjs',
  'request-attempts.integration.cjs',
  'request-price-snapshot.integration.cjs',
  'billing-ledger.integration.cjs',
  'billing-http.integration.cjs',
  'chat-billing.integration.cjs',
  'admin-billing.integration.cjs',
  'audio-generation-tasks.integration.cjs',
  'admin-security.integration.cjs',
  'admin-security-http.integration.cjs',
  'metering-outbox.integration.cjs',
  'metering-outbox-http.integration.cjs',
  'observability-http.integration.cjs',
]

const discovered = readdirSync(__dirname + '/../test')
  .filter((file) => file.endsWith('.cjs'))
  .sort()
const listed = [...tests].sort()
if (JSON.stringify(discovered) !== JSON.stringify(listed)) {
  console.error('CI test manifest is out of date.', { discovered, listed })
  process.exit(1)
}

for (const test of tests) {
  console.log(`\n=== ${test} ===`)
  const command = test.endsWith('.test.cjs') ? ['--test', `test/${test}`] : [`test/${test}`]
  const result = spawnSync(process.execPath, command, { cwd: __dirname + '/..', env: process.env, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
