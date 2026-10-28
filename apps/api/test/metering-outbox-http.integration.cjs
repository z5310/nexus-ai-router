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
  const users = []
  try {
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, errorHttpStatusCode: 422 }))
    await app.init()
    const server = app.getHttpAdapter().getInstance()
    await server.ready()
    const auth = app.get(AuthService)
    const db = app.get(DataSource)
    for (let index = 0; index < 2; index++) {
      users.push(await auth.register({
        name: 'Metering HTTP test',
        email: `metering-http-${randomUUID()}@example.invalid`,
        password: `Test-only-${randomUUID()}!`,
      }, {}))
    }
    const adminHeaders = { authorization: `Bearer ${users[0].accessToken}` }
    const viewerHeaders = { authorization: `Bearer ${users[1].accessToken}` }
    assert.equal((await server.inject({ method: 'GET', url: '/api/admin/metering-events' })).statusCode, 401)
    assert.equal((await server.inject({ method: 'GET', url: '/api/admin/metering-events', headers: viewerHeaders })).statusCode, 403)
    await db.query("UPDATE users SET role = 'admin' WHERE id = $1", [users[0].user.id])
    const listed = await server.inject({ method: 'GET', url: '/api/admin/metering-events?status=pending&limit=1', headers: adminHeaders })
    assert.equal(listed.statusCode, 200)
    assert.ok(Array.isArray(listed.json().data))
    assert.equal((await server.inject({ method: 'GET', url: '/api/admin/metering-events?status=invalid', headers: adminHeaders })).statusCode, 400)
    assert.equal((await server.inject({ method: 'GET', url: '/api/admin/metering-events?limit=201', headers: adminHeaders })).statusCode, 400)
    assert.equal((await server.inject({ method: 'POST', url: '/api/admin/metering-events/not-a-uuid/replay', headers: adminHeaders })).statusCode, 400)
    assert.equal((await server.inject({ method: 'POST', url: `/api/admin/metering-events/${randomUUID()}/replay`, headers: adminHeaders })).statusCode, 404)
    console.log('PASS: metering operations API enforces admin access, validates filters and rejects missing replay targets')
  } finally {
    const db = app.get(DataSource)
    for (const user of users) {
      await db.query('DELETE FROM workspaces WHERE created_by_user_id = $1', [user.user.id])
      await db.query('DELETE FROM users WHERE id = $1', [user.user.id])
    }
    await app.close()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
