require('ts-node').register({ files: true, project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { config } = require('dotenv')
config({ path: require('node:path').join(__dirname, '../../../.env'), quiet: true })
const { NestFactory } = require('@nestjs/core')
const { ValidationPipe } = require('@nestjs/common')
const { FastifyAdapter } = require('@nestjs/platform-fastify')
const { DataSource } = require('typeorm')
const { AppModule } = require('../src/app.module')
const { AuthService } = require('../src/identity/auth.service')

async function main() {
  const app = await NestFactory.create(AppModule, new FastifyAdapter(), { logger: false })
  let user
  try {
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, errorHttpStatusCode: 422 }))
    await app.init()
    const server = app.getHttpAdapter().getInstance()
    await server.ready()
    const auth = app.get(AuthService)
    const db = app.get(DataSource)
    const password = `Test-only-${randomUUID()}!`
    const first = await auth.register({ name: 'Admin security HTTP', email: `security-http-${randomUUID()}@example.invalid`, password }, { ipAddress: '127.0.0.1', userAgent: 'first-device' })
    user = first.user
    const viewerHeaders = { authorization: `Bearer ${first.accessToken}` }
    assert.equal((await server.inject({ method: 'GET', url: '/api/admin/sessions', headers: viewerHeaders })).statusCode, 403)
    await db.query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id])
    const second = await auth.login({ email: user.email, password, remember: false }, { ipAddress: '10.0.0.2', userAgent: 'second-device' })
    const adminHeaders = { authorization: `Bearer ${first.accessToken}` }
    const list = await server.inject({ method: 'GET', url: `/api/admin/sessions?query=${encodeURIComponent(user.email)}&status=active`, headers: adminHeaders })
    assert.equal(list.statusCode, 200)
    const sessions = list.json().data
    assert.equal(sessions.length, 2)
    const current = sessions.find((item) => item.current)
    const other = sessions.find((item) => !item.current)
    assert.ok(current && other)
    assert.equal((await server.inject({ method: 'DELETE', url: `/api/admin/sessions/${current.id}`, headers: adminHeaders })).statusCode, 400)
    assert.equal((await server.inject({ method: 'DELETE', url: `/api/admin/sessions/${other.id}`, headers: adminHeaders })).statusCode, 204)
    assert.equal((await server.inject({ method: 'GET', url: '/api/admin/sessions?status=invalid', headers: adminHeaders })).statusCode, 422)
    assert.equal((await server.inject({ method: 'GET', url: '/api/admin/sessions', headers: { authorization: `Bearer ${second.accessToken}` } })).statusCode, 401)

    for (let attempt = 0; attempt < 20; attempt++) {
      const logs = await server.inject({ method: 'GET', url: `/api/admin/audit-logs?query=${encodeURIComponent(user.email)}`, headers: adminHeaders })
      assert.equal(logs.statusCode, 200)
      if (logs.json().data.some((item) => item.resourceType === 'sessions' && item.resourceId === other.id && item.outcome === 'success')) break
      await new Promise((resolve) => setTimeout(resolve, 20))
      if (attempt === 19) assert.fail('session revocation audit event was not persisted')
    }
    console.log('PASS: admin security HTTP role guard, filters, current-session protection, revocation and audit trail')
  } finally {
    if (user) {
      const db = app.get(DataSource)
      await db.query('ALTER TABLE audit_logs DISABLE TRIGGER audit_logs_immutable')
      await db.query('DELETE FROM audit_logs WHERE actor_user_id = $1', [user.id])
      await db.query('ALTER TABLE audit_logs ENABLE TRIGGER audit_logs_immutable')
      await db.query('DELETE FROM workspaces WHERE created_by_user_id = $1', [user.id])
      await db.query('DELETE FROM users WHERE id = $1', [user.id])
    }
    await app.close()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
