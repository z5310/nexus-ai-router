import { SetMetadata } from '@nestjs/common'
import type { WorkspaceRole } from '@gateway/contracts'

export type WorkspacePermission =
  | 'workspace:read'
  | 'workspace:manage'
  | 'members:read'
  | 'members:manage'
  | 'models:read'
  | 'models:manage'
  | 'routes:read'
  | 'routes:manage'
  | 'keys:read'
  | 'keys:manage'
  | 'usage:read'
  | 'inference:execute'
  | 'ip-policy:read'
  | 'ip-policy:manage'

export const WORKSPACE_PERMISSIONS_KEY = 'workspace.permissions'

const allPermissions: WorkspacePermission[] = [
  'workspace:read',
  'workspace:manage',
  'members:read',
  'members:manage',
  'models:read',
  'models:manage',
  'routes:read',
  'routes:manage',
  'keys:read',
  'keys:manage',
  'usage:read',
  'inference:execute',
  'ip-policy:read',
  'ip-policy:manage',
]

const workspaceRolePermissions: Record<WorkspaceRole, ReadonlySet<WorkspacePermission>> = {
  owner: new Set(allPermissions),
  admin: new Set(allPermissions),
  developer: new Set([
    'workspace:read',
    'members:read',
    'models:read',
    'models:manage',
    'routes:read',
    'routes:manage',
    'keys:read',
    'keys:manage',
    'usage:read',
    'inference:execute',
  ]),
  billing: new Set(['workspace:read', 'members:read', 'usage:read']),
  viewer: new Set(['workspace:read', 'members:read', 'models:read', 'routes:read', 'usage:read']),
}

export const RequireWorkspacePermission = (...permissions: WorkspacePermission[]) => SetMetadata(WORKSPACE_PERMISSIONS_KEY, permissions)

export function hasWorkspacePermissions(role: WorkspaceRole, permissions: WorkspacePermission[]): boolean {
  const granted = workspaceRolePermissions[role]
  return permissions.every((permission) => granted.has(permission))
}
