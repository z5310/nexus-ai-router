import source from './data-source'

async function migrate(): Promise<void> {
  await source.initialize()
  try {
    const migrations = await source.runMigrations({ transaction: 'all' })
    console.log(`Applied ${migrations.length} migration(s).`)
  } finally {
    await source.destroy()
  }
}

void migrate().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Migration failed')
  process.exitCode = 1
})
