require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const source = require('../src/database/data-source').default
const { UserEntity } = require('../src/database/entities/user.entity')
const { AuthSessionEntity } = require('../src/database/entities/auth-session.entity')
const { AuditLogEntity } = require('../src/database/entities/audit-log.entity')
const { SessionsRepository } = require('../src/identity/sessions.repository')
const { AuditRepository } = require('../src/audit/audit.repository')
const { AuditService } = require('../src/audit/audit.service')

async function main() {
  await source.initialize()
  const users = source.getRepository(UserEntity)
  let user
  try {
    user = await users.save(users.create({ name: 'Security test', email: `security-${randomUUID()}@example.invalid`, passwordHash: 'unused', role: 'viewer', status: 'active' }))
    const sessions = new SessionsRepository(source.getRepository(AuthSessionEntity))
    const session = await sessions.create(user.id, randomUUID().replaceAll('-', '').padEnd(64, '0'), new Date(Date.now() + 60_000), { ipAddress: '127.0.0.1', userAgent: 'integration-test' })
    const [active] = await sessions.listForAdmin({ query: user.email, status: 'active', page: 1, pageSize: 10 })
    assert.equal(active.length, 1)
    assert.equal(active[0].user.email, user.email)
    assert.equal(await sessions.revokeByAdmin(session.id), true)
    assert.equal(await sessions.revokeByAdmin(session.id), false)
    const [revoked] = await sessions.listForAdmin({ query: user.email, status: 'revoked', page: 1, pageSize: 10 })
    assert.equal(revoked.length, 1)

    const audit = new AuditService(new AuditRepository(source.getRepository(AuditLogEntity)))
    await audit.record({ actorUserId: user.id, actorEmail: user.email, action: 'admin.delete', resourceType: 'sessions', resourceId: session.id, outcome: 'success', metadata: { method: 'DELETE' } })
    const logs = await audit.list({ query: user.email, page: 1, pageSize: 10 })
    assert.equal(logs.data.length, 1)
    assert.equal(logs.data[0].resourceId, session.id)
    await assert.rejects(() => source.query('UPDATE audit_logs SET action = action WHERE id = $1', [logs.data[0].id]), /append-only/)
    console.log('PASS: admin session search/revocation and immutable audit append/list')
  } finally {
    if (user) {
      await source.query('ALTER TABLE audit_logs DISABLE TRIGGER audit_logs_immutable')
      await source.query('DELETE FROM audit_logs WHERE actor_user_id = $1', [user.id])
      await source.query('ALTER TABLE audit_logs ENABLE TRIGGER audit_logs_immutable')
      await users.delete(user.id)
    }
    await source.destroy()
  }
}

main().catch((error) => { console.error('Admin security integration failed; check PostgreSQL and migrations.', error); process.exitCode = 1 })
