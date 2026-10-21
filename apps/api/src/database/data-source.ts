import { config } from 'dotenv'
import { resolve } from 'node:path'
import { DataSource } from 'typeorm'
import { ModelEntity } from './entities/model.entity'
import { RequestLogEntity } from './entities/request-log.entity'
import { UsageBucketEntity } from './entities/usage-bucket.entity'
import { CreateModels1760000000000 } from './migrations/1760000000000-CreateModels'
import { ExpandCatalogAndUsage1760000001000 } from './migrations/1760000001000-ExpandCatalogAndUsage'

config({ path: resolve(__dirname, '../../../../.env') })

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [ModelEntity, RequestLogEntity, UsageBucketEntity],
  migrations: [CreateModels1760000000000, ExpandCatalogAndUsage1760000001000],
  synchronize: false,
})
