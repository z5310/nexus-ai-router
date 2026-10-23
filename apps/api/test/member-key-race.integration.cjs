// Uses migrated PostgreSQL; creates and deletes only its own workspace, users and keys.
require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const { createHash, randomUUID } = require('node:crypto')
const { IsNull } = require('typeorm')
const source = require('../src/database/data-source').default
const { ApiKeysRepository } = require('../src/api-keys/api-keys.repository')
const { ApiKeysService } = require('../src/api-keys/api-keys.service')
const { InferenceRepository } = require('../src/inference/inference.repository')
const { WorkspacesService } = require('../src/workspaces/workspaces.service')
const { ApiKeyEntity } = require('../src/database/entities/api-key.entity')
const { UserEntity } = require('../src/database/entities/user.entity')
const { WorkspaceEntity } = require('../src/database/entities/workspace.entity')
const { WorkspaceMemberEntity } = require('../src/database/entities/workspace-member.entity')
const { WorkspaceModelEntity } = require('../src/database/entities/workspace-model.entity')

async function main() {
  await source.initialize()
  const users = source.getRepository(UserEntity)
  const workspaces = source.getRepository(WorkspaceEntity)
  const members = source.getRepository(WorkspaceMemberEntity)
  const keyEntities = source.getRepository(ApiKeyEntity)
  const createdUsers = []
  let workspace
  try {
    for (const name of ['owner', 'developer']) {
      createdUsers.push(await users.save(users.create({
        name,
        email: `key-race-${name}-${randomUUID()}@example.invalid`,
        passwordHash: 'unused',
        role: 'viewer',
        status: 'active',
      })))
    }
    workspace = await workspaces.save(workspaces.create({
      name: 'Member key race test',
      slug: `key-race-${randomUUID()}`,
      createdByUserId: createdUsers[0].id,
    }))
    await members.save(members.create({ workspaceId: workspace.id, userId: createdUsers[0].id, role: 'owner', status: 'active' }))

    const keyRepository = new ApiKeysRepository(keyEntities, source)
    const keyService = new ApiKeysService(keyRepository)
    const workspaceService = new WorkspacesService(workspaces, members, source)
    const inference = new InferenceRepository(keyEntities, source.getRepository(WorkspaceModelEntity), source)

    for (let iteration = 0; iteration < 12; iteration += 1) {
      const developer = await members.save(members.create({
        workspaceId: workspace.id,
        userId: createdUsers[1].id,
        role: 'developer',
        status: 'active',
      }))
      await Promise.allSettled([
        keyService.create(workspace.id, createdUsers[1].id, `remove-race-${iteration}`),
        workspaceService.manageMember(createdUsers[0].id, workspace.id, developer.id, null),
      ])
      assert.equal(await members.findOneBy({ id: developer.id }), null)
      assert.equal(
        await keyEntities.count({ where: { workspaceId: workspace.id, userId: createdUsers[1].id, revokedAt: IsNull() } }),
        0,
        'member removal and key creation must never leave an active key',
      )
    }

    const developer = await members.save(members.create({
      workspaceId: workspace.id,
      userId: createdUsers[1].id,
      role: 'developer',
      status: 'active',
    }))
    await Promise.allSettled([
      keyService.create(workspace.id, createdUsers[1].id, 'downgrade-race'),
      workspaceService.manageMember(createdUsers[0].id, workspace.id, developer.id, 'viewer'),
    ])
    assert.equal((await members.findOneByOrFail({ id: developer.id })).role, 'viewer')
    assert.equal(
      await keyEntities.count({ where: { workspaceId: workspace.id, userId: createdUsers[1].id, revokedAt: IsNull() } }),
      0,
      'downgrade and key creation must never leave an active key',
    )

    const staleSecret = `nxs_live_${randomUUID().replaceAll('-', '')}`
    await keyEntities.save(keyEntities.create({
      userId: createdUsers[1].id,
      workspaceId: workspace.id,
      name: 'stale-key-defense',
      keyHash: createHash('sha256').update(staleSecret).digest('hex'),
      keyPrefix: staleSecret.slice(0, 12),
      lastFour: staleSecret.slice(-4),
    }))
    assert.equal(
      await inference.findActiveKey(createHash('sha256').update(staleSecret).digest('hex')),
      null,
      'API key authentication rejects a key whose creator no longer has key permission',
    )
    console.log('PASS: member removal/downgrade races cannot leave a usable API key')
  } finally {
    if (workspace) {
      await keyEntities.delete({ workspaceId: workspace.id })
      await members.delete({ workspaceId: workspace.id })
      await workspaces.delete(workspace.id)
    }
    for (const user of createdUsers) await users.delete(user.id)
    await source.destroy()
  }
}

main().catch((error) => {
  console.error('Member/key race integration failed; check local PostgreSQL and migrations.', error)
  process.exitCode = 1
})
