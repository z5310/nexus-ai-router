require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const source = require('../src/database/data-source').default
const { ModelEntity } = require('../src/database/entities/model.entity')
const { ProviderCredentialEntity } = require('../src/database/entities/provider-credential.entity')
const { ProviderEntity } = require('../src/database/entities/provider.entity')
const { ProviderChannelEntity } = require('../src/database/entities/provider-channel.entity')
const { ModelDeploymentEntity } = require('../src/database/entities/model-deployment.entity')
const { ProviderCredentialsRepository } = require('../src/providers/provider-credentials.repository')
const { ProviderChannelsRepository } = require('../src/providers/provider-channels.repository')
const { ModelDeploymentsRepository } = require('../src/providers/model-deployments.repository')
const { ProviderConfigurationService } = require('../src/providers/provider-configuration.service')
const { ProvidersRepository } = require('../src/providers/providers.repository')
const { ProvidersService } = require('../src/providers/providers.service')

async function main() {
  await source.initialize()
  const suffix = randomUUID().slice(0, 8)
  const provider = `test-${suffix}`
  let credentialId
  let providerId
  let channelId
  let deploymentId
  try {
    const [user] = await source.query('SELECT id FROM users ORDER BY created_at ASC LIMIT 1')
    const model = await source.getRepository(ModelEntity).findOne({ where: { isEnabled: true }, order: { createdAt: 'ASC' } })
    assert.ok(user && model, 'migrated development user and model are required')

    const providerRepository = source.getRepository(ProviderEntity)
    const providerRecord = await providerRepository.save(providerRepository.create({
      code: provider, name: `Integration ${suffix}`, protocol: 'openai_compatible', baseUrl: null,
      docsUrl: null, capabilities: ['text'], enabled: true, sortOrder: 999, createdByUserId: user.id,
    }))
    providerId = providerRecord.id

    const credentialRepository = source.getRepository(ProviderCredentialEntity)
    const credential = await credentialRepository.save(credentialRepository.create({
      provider,
      environment: 'development',
      name: `integration-${suffix}`,
      encryptedSecret: 'integration-only',
      iv: '000000000000000000000000',
      authTag: '000000000000000000000000',
      keyVersion: 'integration',
      secretLastFour: 'test',
      enabled: true,
      createdByUserId: user.id,
      rotatedAt: new Date(),
    }))
    credentialId = credential.id

    const channels = new ProviderChannelsRepository(source.getRepository(ProviderChannelEntity))
    const deployments = new ModelDeploymentsRepository(source.getRepository(ModelDeploymentEntity))
    const providers = new ProvidersService(new ProvidersRepository(providerRepository))
    const service = new ProviderConfigurationService(
      channels,
      deployments,
      new ProviderCredentialsRepository(credentialRepository),
      providers,
      source.getRepository(ModelEntity),
      { get: (_key, fallbackValue) => fallbackValue },
    )

    const channel = await service.createChannel(user.id, {
      name: `primary-${suffix}`,
      provider,
      environment: 'development',
      credentialId,
      region: 'global',
      timeoutMs: 25_000,
      maxConcurrency: 7,
      enabled: true,
    })
    channelId = channel.id
    assert.equal(channel.credentialMaskedKey, '••••••••test')

    const deployment = await service.createDeployment({
      modelId: model.id,
      channelId,
      upstreamModelId: `upstream-${suffix}`,
      priority: 10,
      weight: 100,
      enabled: true,
    })
    deploymentId = deployment.id

    const [target] = await service.resolveTargets(model)
    assert.equal(target.channelId, channelId)
    assert.equal(target.deploymentId, deploymentId)
    assert.equal(target.model, `upstream-${suffix}`)
    assert.equal(target.maxConcurrency, 7)

    await service.recordResult(target, 'upstream_502')
    await service.recordResult(target, 'upstream_502')
    await service.recordResult(target, 'upstream_502')
    const unhealthy = await channels.find(channelId)
    assert.equal(unhealthy.healthStatus, 'unhealthy')
    assert.equal(unhealthy.consecutiveFailures, 3)
    const [fallback] = await service.resolveTargets(model)
    assert.equal(fallback.channelId, undefined)

    await service.recordResult(target)
    const recovered = await channels.find(channelId)
    assert.equal(recovered.healthStatus, 'healthy')
    assert.equal(recovered.consecutiveFailures, 0)
    assert.equal((await service.resolveTargets(model))[0].channelId, channelId)
    console.log('PASS: provider channel, model deployment, health degradation and circuit exclusion work together')
  } finally {
    if (deploymentId) await source.getRepository(ModelDeploymentEntity).delete(deploymentId)
    if (channelId) await source.getRepository(ProviderChannelEntity).delete(channelId)
    if (credentialId) await source.getRepository(ProviderCredentialEntity).delete(credentialId)
    if (providerId) await source.getRepository(ProviderEntity).delete(providerId)
    await source.destroy()
  }
}

main().catch((error) => {
  console.error('Provider routing integration failed; check PostgreSQL and migrations.', error)
  process.exitCode = 1
})
