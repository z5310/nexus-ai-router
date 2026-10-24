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
  const userIds = []
  try {
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, errorHttpStatusCode: 422 }))
    await app.init()
    const server = app.getHttpAdapter().getInstance()
    await server.ready()
    const auth = app.get(AuthService)
    const db = app.get(DataSource)
    const password = `Test-only-${randomUUID()}!`
    const owner = await auth.register({ name: 'Invite owner', email: `invite-owner-${randomUUID()}@example.invalid`, password }, { ipAddress: '127.0.0.1', userAgent: 'owner-test' })
    const invitee = await auth.register({ name: 'Invite member', email: `invite-member-${randomUUID()}@example.invalid`, password }, { ipAddress: '127.0.0.1', userAgent: 'invitee-test' })
    userIds.push(owner.user.id, invitee.user.id)
    const [workspace] = await db.query('SELECT id FROM workspaces WHERE created_by_user_id = $1', [owner.user.id])
    const ownerHeaders = { authorization: `Bearer ${owner.accessToken}`, 'x-workspace-id': workspace.id }
    const inviteeHeaders = { authorization: `Bearer ${invitee.accessToken}`, 'x-workspace-id': workspace.id }

    assert.equal((await server.inject({ method: 'GET', url: '/api/workspaces/current/invitations', headers: inviteeHeaders })).statusCode, 403)
    assert.equal((await server.inject({ method: 'POST', url: '/api/workspaces/current/invitations', headers: ownerHeaders, payload: { email: 'invalid', role: 'developer' } })).statusCode, 422)
    const created = await server.inject({ method: 'POST', url: '/api/workspaces/current/invitations', headers: ownerHeaders, payload: { email: invitee.user.email, role: 'developer' } })
    assert.equal(created.statusCode, 201)
    const invitation = created.json()
    assert.ok(invitation.token)
    assert.equal((await server.inject({ method: 'POST', url: '/api/workspace-invitations/accept', headers: { authorization: `Bearer ${invitee.accessToken}` }, payload: { token: invitation.token } })).statusCode, 201)
    assert.equal((await server.inject({ method: 'POST', url: '/api/workspace-invitations/accept', headers: { authorization: `Bearer ${invitee.accessToken}` }, payload: { token: invitation.token } })).statusCode, 409)

    const memberList = await server.inject({ method: 'GET', url: '/api/workspaces/current/members', headers: ownerHeaders })
    assert.equal(memberList.statusCode, 200)
    const target = memberList.json().data.find((item) => item.email === invitee.user.email)
    assert.ok(target)
    const transfer = await server.inject({ method: 'POST', url: '/api/workspaces/current/transfer-ownership', headers: ownerHeaders, payload: { memberId: target.id } })
    assert.equal(transfer.statusCode, 201)
    assert.equal(transfer.json().ownerMemberId, target.id)
    assert.equal((await server.inject({ method: 'POST', url: '/api/workspaces/current/transfer-ownership', headers: ownerHeaders, payload: { memberId: target.id } })).statusCode, 403)

    for (let attempt = 0; attempt < 20; attempt++) {
      const [row] = await db.query("SELECT COUNT(*)::int AS count FROM audit_logs WHERE actor_user_id = $1 AND resource_type IN ('workspace_invitation','workspace_ownership')", [owner.user.id])
      if (row.count >= 2) break
      await new Promise((resolve) => setTimeout(resolve, 20))
      if (attempt === 19) assert.fail('workspace audit events were not persisted')
    }
    console.log('PASS: workspace invitation HTTP validation, permission, acceptance, replay, ownership transfer and audit')
  } finally {
    const db = app.get(DataSource)
    if (userIds.length) {
      await db.query('ALTER TABLE audit_logs DISABLE TRIGGER audit_logs_immutable')
      await db.query('DELETE FROM audit_logs WHERE actor_user_id = ANY($1::uuid[])', [userIds])
      await db.query('ALTER TABLE audit_logs ENABLE TRIGGER audit_logs_immutable')
      await db.query('DELETE FROM workspaces WHERE created_by_user_id = ANY($1::uuid[])', [userIds])
      await db.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [userIds])
    }
    await app.close()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
