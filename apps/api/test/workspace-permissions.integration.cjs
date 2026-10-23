// Uses migrated PostgreSQL; creates and deletes only its own workspace and users.
require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const source = require('../src/database/data-source').default
const { WorkspaceContextGuard } = require('../src/workspaces/workspace-context.guard')
const { WorkspacesService } = require('../src/workspaces/workspaces.service')
const { WorkspaceEntity } = require('../src/database/entities/workspace.entity')
const { WorkspaceMemberEntity } = require('../src/database/entities/workspace-member.entity')
const { UserEntity } = require('../src/database/entities/user.entity')

const permissions = [
  'workspace:read', 'workspace:manage', 'members:read', 'members:manage',
  'models:read', 'models:manage', 'routes:read', 'routes:manage',
  'keys:read', 'keys:manage', 'usage:read', 'inference:execute',
  'ip-policy:read', 'ip-policy:manage',
]

const expected = {
  owner: new Set(permissions),
  admin: new Set(permissions),
  developer: new Set([
    'workspace:read', 'members:read', 'models:read', 'models:manage',
    'routes:read', 'routes:manage', 'keys:read', 'keys:manage',
    'usage:read', 'inference:execute',
  ]),
  billing: new Set(['workspace:read', 'members:read', 'usage:read']),
  viewer: new Set(['workspace:read', 'members:read', 'models:read', 'routes:read', 'usage:read']),
}

function executionContext(request) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  }
}

async function main() {
  await source.initialize()
  const users = source.getRepository(UserEntity)
  const workspaces = source.getRepository(WorkspaceEntity)
  const members = source.getRepository(WorkspaceMemberEntity)
  const createdUsers = []
  let workspace
  try {
    for (const role of ['owner', 'admin', 'developer', 'billing', 'viewer']) {
      createdUsers.push(await users.save(users.create({
        name: role,
        email: `permission-${role}-${randomUUID()}@example.invalid`,
        passwordHash: 'unused',
        role: 'viewer',
        status: 'active',
      })))
    }
    workspace = await workspaces.save(workspaces.create({
      name: 'Permission matrix test',
      slug: `permission-${randomUUID()}`,
      createdByUserId: createdUsers[0].id,
    }))
    for (const [index, role] of ['owner', 'admin', 'developer', 'billing', 'viewer'].entries()) {
      await members.save(members.create({ workspaceId: workspace.id, userId: createdUsers[index].id, role, status: 'active' }))
    }

    const workspacesService = new WorkspacesService(workspaces, members, source)
    for (const [index, role] of ['owner', 'admin', 'developer', 'billing', 'viewer'].entries()) {
      for (const permission of permissions) {
        const reflector = { getAllAndOverride: () => [permission] }
        const guard = new WorkspaceContextGuard(workspacesService, reflector)
        const request = { user: { sub: createdUsers[index].id }, headers: { 'x-workspace-id': workspace.id } }
        if (expected[role].has(permission)) {
          assert.equal(await guard.canActivate(executionContext(request)), true, `${role} should have ${permission}`)
          assert.equal(request.workspace.role, role)
        } else {
          await assert.rejects(
            () => guard.canActivate(executionContext(request)),
            (error) => error.getStatus() === 403,
            `${role} should not have ${permission}`,
          )
        }
      }
    }
    console.log('PASS: all five workspace roles match the centralized permission matrix')
  } finally {
    if (workspace) {
      await members.delete({ workspaceId: workspace.id })
      await workspaces.delete(workspace.id)
    }
    for (const user of createdUsers) await users.delete(user.id)
    await source.destroy()
  }
}

main().catch(() => {
  console.error('Workspace permission integration failed; check local PostgreSQL and migrations.')
  process.exitCode = 1
})
