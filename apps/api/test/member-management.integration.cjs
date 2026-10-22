require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const source = require('../src/database/data-source').default
const { WorkspacesService } = require('../src/workspaces/workspaces.service')
const { WorkspaceEntity } = require('../src/database/entities/workspace.entity')
const { WorkspaceMemberEntity } = require('../src/database/entities/workspace-member.entity')
const { UserEntity } = require('../src/database/entities/user.entity')
const { ApiKeyEntity } = require('../src/database/entities/api-key.entity')
async function main() {
  await source.initialize()
  const users = source.getRepository(UserEntity)
  const workspaces = source.getRepository(WorkspaceEntity)
  const members = source.getRepository(WorkspaceMemberEntity)
  const keys = source.getRepository(ApiKeyEntity)
  const created = []
  let workspace
  try {
    for (const role of ['owner', 'admin', 'developer', 'viewer']) {
      created.push(await users.save(users.create({ name: role, email: `${randomUUID()}@example.invalid`, passwordHash: 'unused', role: 'viewer', status: 'active' })))
    }
    workspace = await workspaces.save(workspaces.create({ name: 'Member test', slug: randomUUID(), createdByUserId: created[0].id }))
    const entries = []
    for (const [index, role] of ['owner', 'admin', 'developer', 'viewer'].entries()) {
      entries.push(await members.save(members.create({ workspaceId: workspace.id, userId: created[index].id, role, status: 'active' })))
    }
    const service = new WorkspacesService(workspaces, members, source)
    const denied = (fn) => assert.rejects(fn, (error) => error.getStatus() === 403)
    await denied(() => service.manageMember(created[3].id, workspace.id, entries[2].id, 'admin'))
    await denied(() => service.manageMember(created[1].id, workspace.id, entries[2].id, 'admin'))
    await denied(() => service.manageMember(created[0].id, workspace.id, entries[0].id, null))
    await assert.rejects(() => service.manageMember(created[0].id, workspace.id, randomUUID(), null), (error) => error.getStatus() === 404)
    await service.manageMember(created[0].id, workspace.id, entries[2].id, 'billing')
    assert.equal((await members.findOneByOrFail({ id: entries[2].id })).role, 'billing')
    const key = await keys.save(keys.create({ userId: created[2].id, workspaceId: workspace.id, name: 'test', keyHash: randomUUID().replaceAll('-', '').padEnd(64, '0'), keyPrefix: 'nxs_live_test', lastFour: 'test' }))
    await service.manageMember(created[1].id, workspace.id, entries[2].id, null)
    assert.equal(await members.findOneBy({ id: entries[2].id }), null)
    assert.ok((await keys.findOneByOrFail({ id: key.id })).revokedAt)
    console.log('PASS: persisted role, owner protection, viewer/admin restrictions, scoped lookup, member removal and key revocation')
  } finally {
    if (workspace) { await keys.delete({ workspaceId: workspace.id }); await members.delete({ workspaceId: workspace.id }); await workspaces.delete(workspace.id) }
    for (const user of created) await users.delete(user.id)
    await source.destroy()
  }
}
main().catch(() => { console.error('Member integration failed'); process.exitCode = 1 })
