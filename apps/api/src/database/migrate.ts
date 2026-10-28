import source from './data-source'
import { validateEnvironment } from '../config/env'
import { disableSeededIdentities } from '../config/production-database-safety'

async function migrate(): Promise<void> {
  const environment = validateEnvironment(process.env)
  await source.initialize()
  try {
    const migrations = await source.runMigrations({ transaction: 'all' })
    let disabledIdentities = 0
    if (environment.NODE_ENV === 'production') {
      // 生产迁移与身份停用共用同一个显式入口；应用容器本身不偷偷修改数据库。
      // 该清理可重复执行，因此每次发布都能修正误恢复的历史演示身份。
      disabledIdentities = await source.transaction((manager) => disableSeededIdentities(manager))
    }
    console.log(`Applied ${migrations.length} migration(s).`)
    if (environment.NODE_ENV === 'production') console.log(`Disabled ${disabledIdentities} seeded identity record(s).`)
  } finally {
    await source.destroy()
  }
}

void migrate().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Migration failed')
  process.exitCode = 1
})
