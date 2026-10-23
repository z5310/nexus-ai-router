// Uses migrated PostgreSQL; creates and deletes only its own account and sessions.
require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { JwtService } = require('@nestjs/jwt')
const source = require('../src/database/data-source').default
const { JwtAuthGuard } = require('../src/identity/auth.guard')
const { SessionsRepository } = require('../src/identity/sessions.repository')
const { AuthSessionEntity } = require('../src/database/entities/auth-session.entity')
const { UserEntity } = require('../src/database/entities/user.entity')

function executionContext(token) {
  const request = { headers: { authorization: `Bearer ${token}` } }
  return {
    request,
    context: { switchToHttp: () => ({ getRequest: () => request }) },
  }
}

async function main() {
  await source.initialize()
  const users = source.getRepository(UserEntity)
  const sessions = new SessionsRepository(source.getRepository(AuthSessionEntity))
  const jwt = new JwtService({ secret: process.env.JWT_SECRET })
  const guard = new JwtAuthGuard(jwt, sessions)
  let user
  try {
    user = await users.save(users.create({
      name: 'Access revocation test',
      email: `access-${randomUUID()}@example.invalid`,
      passwordHash: 'unused',
      role: 'viewer',
      status: 'active',
    }))
    const hash = () => randomUUID().replaceAll('-', '').padEnd(64, '0')
    const expiry = new Date(Date.now() + 60_000)
    const firstSession = await sessions.create(user.id, hash(), expiry, {})
    const firstToken = await jwt.signAsync({ sub: user.id, email: user.email, role: 'viewer', sid: firstSession.id }, { expiresIn: 300 })

    const active = executionContext(firstToken)
    assert.equal(await guard.canActivate(active.context), true)
    assert.equal(active.request.user.role, 'viewer')

    await users.update(user.id, { role: 'admin' })
    const currentRole = executionContext(firstToken)
    assert.equal(await guard.canActivate(currentRole.context), true)
    assert.equal(currentRole.request.user.role, 'admin', 'the database role replaces the stale JWT role')

    await sessions.revokeById(user.id, firstSession.id)
    await assert.rejects(
      () => guard.canActivate(executionContext(firstToken).context),
      (error) => error.getStatus() === 401,
      'revoked session rejects its access token immediately',
    )

    const secondSession = await sessions.create(user.id, hash(), expiry, {})
    const secondToken = await jwt.signAsync({ sub: user.id, email: user.email, role: 'admin', sid: secondSession.id }, { expiresIn: 300 })
    await users.update(user.id, { status: 'suspended' })
    await assert.rejects(
      () => guard.canActivate(executionContext(secondToken).context),
      (error) => error.getStatus() === 401,
      'suspended account rejects every active access token immediately',
    )
    console.log('PASS: current role, session revocation and account suspension take effect on the next request')
  } finally {
    if (user) await users.delete(user.id)
    await source.destroy()
  }
}

main().catch((error) => {
  console.error('Access revocation integration failed; check local PostgreSQL and migrations.', error)
  process.exitCode = 1
})
