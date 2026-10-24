require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const source = require('../src/database/data-source').default
const { WorkspaceInvitationsService } = require('../src/workspaces/workspace-invitations.service')
const { WorkspacesService } = require('../src/workspaces/workspaces.service')
const { WorkspaceEntity } = require('../src/database/entities/workspace.entity')
const { WorkspaceInvitationEntity } = require('../src/database/entities/workspace-invitation.entity')
const { WorkspaceMemberEntity } = require('../src/database/entities/workspace-member.entity')
const { UserEntity } = require('../src/database/entities/user.entity')

async function main() {
  await source.initialize()
  const users = source.getRepository(UserEntity)
  const workspaces = source.getRepository(WorkspaceEntity)
  const members = source.getRepository(WorkspaceMemberEntity)
  const invitations = source.getRepository(WorkspaceInvitationEntity)
  const createdUsers = []
  let workspace
  try {
    for (const name of ['owner', 'admin', 'invitee', 'wrong', 'expired']) {
      createdUsers.push(await users.save(users.create({ name, email: `${name}-${randomUUID()}@example.invalid`, passwordHash: 'unused', role: 'viewer', status: 'active' })))
    }
    workspace = await workspaces.save(workspaces.create({ name: 'Invitation test', slug: `invite-${randomUUID()}`, createdByUserId: createdUsers[0].id }))
    const ownerMember = await members.save(members.create({ workspaceId: workspace.id, userId: createdUsers[0].id, role: 'owner', status: 'active' }))
    await members.save(members.create({ workspaceId: workspace.id, userId: createdUsers[1].id, role: 'admin', status: 'active' }))
    const workspaceService = new WorkspacesService(workspaces, members, source)
    const service = new WorkspaceInvitationsService(invitations, source, workspaceService)

    const created = await service.create(createdUsers[0].id, workspace.id, { email: createdUsers[2].email.toUpperCase(), role: 'developer' })
    assert.equal(created.email, createdUsers[2].email)
    assert.equal(created.status, 'pending')
    assert.ok(created.token.length >= 40)
    assert.notEqual((await invitations.findOneByOrFail({ id: created.id })).tokenHash, created.token)
    await assert.rejects(() => service.create(createdUsers[0].id, workspace.id, { email: createdUsers[2].email, role: 'viewer' }), (error) => error.getStatus() === 409)
    await assert.rejects(() => service.accept(createdUsers[3].id, createdUsers[3].email, created.token), (error) => error.getStatus() === 403)
    const accepted = await service.accept(createdUsers[2].id, createdUsers[2].email, created.token)
    assert.equal(accepted.workspace.id, workspace.id)
    const inviteeMember = await members.findOneByOrFail({ workspaceId: workspace.id, userId: createdUsers[2].id })
    assert.equal(inviteeMember.role, 'developer')
    await assert.rejects(() => service.accept(createdUsers[2].id, createdUsers[2].email, created.token), (error) => error.getStatus() === 409)

    const revoked = await service.create(createdUsers[0].id, workspace.id, { email: createdUsers[3].email, role: 'viewer' })
    await service.revoke(createdUsers[0].id, workspace.id, revoked.id)
    await assert.rejects(() => service.accept(createdUsers[3].id, createdUsers[3].email, revoked.token), (error) => error.getStatus() === 409)

    const expiring = await service.create(createdUsers[0].id, workspace.id, { email: createdUsers[4].email, role: 'billing' })
    await invitations.update(expiring.id, { expiresAt: new Date(Date.now() - 1_000) })
    await assert.rejects(() => service.accept(createdUsers[4].id, createdUsers[4].email, expiring.token), (error) => error.getStatus() === 400)
    assert.equal((await invitations.findOneByOrFail({ id: expiring.id })).status, 'expired')
    const resent = await service.resend(createdUsers[0].id, workspace.id, expiring.id)
    assert.notEqual(resent.token, expiring.token)
    await assert.rejects(() => service.accept(createdUsers[4].id, createdUsers[4].email, expiring.token), (error) => error.getStatus() === 404)
    await service.accept(createdUsers[4].id, createdUsers[4].email, resent.token)

    await assert.rejects(() => service.create(createdUsers[1].id, workspace.id, { email: `${randomUUID()}@example.invalid`, role: 'admin' }), (error) => error.getStatus() === 403)
    const transfer = await workspaceService.transferOwnership(createdUsers[0].id, workspace.id, inviteeMember.id)
    assert.equal(transfer.previousOwnerMemberId, ownerMember.id)
    assert.equal((await members.findOneByOrFail({ id: ownerMember.id })).role, 'admin')
    assert.equal((await members.findOneByOrFail({ id: inviteeMember.id })).role, 'owner')
    await assert.rejects(() => workspaceService.transferOwnership(createdUsers[0].id, workspace.id, ownerMember.id), (error) => error.getStatus() === 403)

    console.log('PASS: invitation email binding, one-time token, revoke, expiry, resend and ownership transfer')
  } finally {
    if (workspace) {
      await invitations.delete({ workspaceId: workspace.id })
      await members.delete({ workspaceId: workspace.id })
      await workspaces.delete(workspace.id)
    }
    for (const user of createdUsers) await users.delete(user.id)
    await source.destroy()
  }
}

main().catch((error) => {
  console.error(error)
  console.error('Workspace invitation integration failed; check local PostgreSQL and migrations.')
  process.exitCode = 1
})
