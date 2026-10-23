require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const source = require('../src/database/data-source').default
const { ProviderEntity } = require('../src/database/entities/provider.entity')
const { ProvidersRepository } = require('../src/providers/providers.repository')
const { ProvidersService } = require('../src/providers/providers.service')

async function main() {
  await source.initialize()
  let createdId
  try {
    const [actor] = await source.query("SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1")
    assert.ok(actor, 'an admin user is required')
    const service = new ProvidersService(new ProvidersRepository(source.getRepository(ProviderEntity)))
    const code = `test-provider-${Date.now()}`

    const created = await service.create(actor.id, {
      code, name: '测试供应商', protocol: 'openai_compatible', baseUrl: 'https://example.com/v1',
      docsUrl: 'https://example.com/docs', capabilities: ['text', 'embedding'], enabled: true, sortOrder: 999,
    })
    createdId = created.id
    assert.equal(created.code, code)
    assert.deepEqual(created.capabilities, ['text', 'embedding'])
    assert.equal((await service.assertEnabled(code)).id, created.id)

    const updated = await service.update(created.id, { name: '测试供应商二号', enabled: false, capabilities: ['text'] })
    assert.equal(updated.name, '测试供应商二号')
    assert.equal(updated.enabled, false)
    await assert.rejects(() => service.assertEnabled(code), /供应商已停用/)
    assert.ok((await service.list({})).data.some((item) => item.id === created.id))

    await service.remove(created.id)
    createdId = undefined
    assert.equal((await service.list({})).data.some((item) => item.code === code), false)
    console.log('PASS: admin provider registry supports create, list, update, disable, and delete')
  } finally {
    if (createdId) await source.query('DELETE FROM providers WHERE id = $1', [createdId])
    await source.destroy()
  }
}

main().catch((error) => {
  console.error('Provider registry integration failed; check PostgreSQL and migrations.', error)
  process.exitCode = 1
})
