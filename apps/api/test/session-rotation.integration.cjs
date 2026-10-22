// Uses migrated PostgreSQL; creates and deletes only its own account.
require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const source = require('../src/database/data-source').default
const { SessionsRepository } = require('../src/identity/sessions.repository')
const { AuthSessionEntity } = require('../src/database/entities/auth-session.entity')
const { UserEntity } = require('../src/database/entities/user.entity')

async function main() {
  await source.initialize()
  const users = source.getRepository(UserEntity)
  let user
  try {
    user = await users.save(users.create({ name: 'Rotation test', email: `rotation-${randomUUID()}@example.invalid`, passwordHash: 'unused', role: 'viewer', status: 'active' }))
    const sessions = new SessionsRepository(source.getRepository(AuthSessionEntity))
    const hash = () => randomUUID().replaceAll('-', '').padEnd(64, '0')
    const old = hash()
    const expiry = new Date(Date.now() + 60_000)
    await sessions.create(user.id, old, expiry, {})
    const other = await sessions.create(user.id, hash(), expiry, {})
    const results = await Promise.all(Array.from({ length: 8 }, () => sessions.rotate(old, hash(), {})))
    assert.equal(results.filter(Boolean).length, 1, 'only one concurrent refresh may succeed')
    const next = results.find(Boolean)
    assert.equal(next.expiresAt.getTime(), expiry.getTime(), 'refresh preserves absolute expiry')
    assert.equal(await sessions.findActive(next.tokenHash), null, 'replay revokes successor')
    assert.ok(await sessions.findActive(other.tokenHash), 'another device remains active')
    const current = hash()
    await sessions.create(user.id, current, expiry, {})
    const first = await sessions.rotate(current, hash(), {})
    assert.ok(first)
    const second = await sessions.rotate(first.tokenHash, hash(), {})
    assert.ok(second, 'normal sequential refresh succeeds')
    assert.equal(await sessions.rotate(current, hash(), {}), null)
    assert.equal(await sessions.findActive(second.tokenHash), null, 'ancestor replay revokes latest descendant')
    const expired = hash()
    await sessions.create(user.id, expired, new Date(Date.now() - 1000), {})
    assert.equal(await sessions.rotate(expired, hash(), {}), null)
    assert.equal(await sessions.rotate(hash(), hash(), {}), null)
    console.log('PASS: concurrent rotation, absolute expiry, family replay, device isolation, expired and unknown tokens')
  } finally {
    if (user) await users.delete(user.id)
    await source.destroy()
  }
}
main().catch(() => { console.error('Session rotation integration failed; check local PostgreSQL and migrations.'); process.exitCode = 1 })
