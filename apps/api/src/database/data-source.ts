import { WorkspaceIpPolicy1760000009000 } from './migrations/1760000009000-WorkspaceIpPolicy'
import { SessionRotation1760000008000 } from './migrations/1760000008000-SessionRotation'
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { DataSource } from 'typeorm'
import { ModelEntity } from './entities/model.entity'
import { RequestLogEntity } from './entities/request-log.entity'
import { UsageBucketEntity } from './entities/usage-bucket.entity'
import { UserEntity } from './entities/user.entity'
import { AuthSessionEntity } from './entities/auth-session.entity'
import { AuthActionTokenEntity } from './entities/auth-action-token.entity'
import { ApiKeyEntity } from './entities/api-key.entity'
import { WorkspaceModelEntity } from './entities/workspace-model.entity'
import { RouteRuleEntity } from './entities/route-rule.entity'
import { WorkspaceEntity } from './entities/workspace.entity'
import { WorkspaceMemberEntity } from './entities/workspace-member.entity'
import { ProjectEntity } from './entities/project.entity'
import { ProviderCredentialEntity } from './entities/provider-credential.entity'
import { CreateModels1760000000000 } from './migrations/1760000000000-CreateModels'
import { ExpandCatalogAndUsage1760000001000 } from './migrations/1760000001000-ExpandCatalogAndUsage'
import { CreateIdentity1760000002000 } from './migrations/1760000002000-CreateIdentity'
import { HardenIdentity1760000003000 } from './migrations/1760000003000-HardenIdentity'
import { CreateWorkspaceConfiguration1760000004000 } from './migrations/1760000004000-CreateWorkspaceConfiguration'
import { CreateRouteRulesAndScopeUsage1760000005000 } from './migrations/1760000005000-CreateRouteRulesAndScopeUsage'
import { CreateWorkspaceTenancy1760000006000 } from './migrations/1760000006000-CreateWorkspaceTenancy'
import { CreateProviderCredentials1760000007000 } from './migrations/1760000007000-CreateProviderCredentials'

config({ path: resolve(__dirname, '../../../../.env') })

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [ModelEntity, RequestLogEntity, UsageBucketEntity, UserEntity, AuthSessionEntity, AuthActionTokenEntity, ApiKeyEntity, WorkspaceModelEntity, RouteRuleEntity, WorkspaceEntity, WorkspaceMemberEntity, ProjectEntity, ProviderCredentialEntity],
  migrations: [CreateModels1760000000000, ExpandCatalogAndUsage1760000001000, CreateIdentity1760000002000, HardenIdentity1760000003000, CreateWorkspaceConfiguration1760000004000, CreateRouteRulesAndScopeUsage1760000005000, CreateWorkspaceTenancy1760000006000, CreateProviderCredentials1760000007000, SessionRotation1760000008000, WorkspaceIpPolicy1760000009000],
  synchronize: false,
})
