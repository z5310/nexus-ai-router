import { config } from 'dotenv'
import { resolve } from 'node:path'
import { DataSource } from 'typeorm'
import { ModelEntity } from './entities/model.entity'
import { RequestLogEntity } from './entities/request-log.entity'
import { UsageBucketEntity } from './entities/usage-bucket.entity'
import { UserEntity } from './entities/user.entity'
import { AuthSessionEntity } from './entities/auth-session.entity'
import { AuthActionTokenEntity } from './entities/auth-action-token.entity'
import { CreateModels1760000000000 } from './migrations/1760000000000-CreateModels'
import { ExpandCatalogAndUsage1760000001000 } from './migrations/1760000001000-ExpandCatalogAndUsage'
import { CreateIdentity1760000002000 } from './migrations/1760000002000-CreateIdentity'
import { HardenIdentity1760000003000 } from './migrations/1760000003000-HardenIdentity'

config({ path: resolve(__dirname, '../../../../.env') })

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [ModelEntity, RequestLogEntity, UsageBucketEntity, UserEntity, AuthSessionEntity, AuthActionTokenEntity],
  migrations: [CreateModels1760000000000, ExpandCatalogAndUsage1760000001000, CreateIdentity1760000002000, HardenIdentity1760000003000],
  synchronize: false,
})
