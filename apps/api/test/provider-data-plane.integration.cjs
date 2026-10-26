require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { createServer } = require('node:http')
const source = require('../src/database/data-source').default
const { ModelEntity } = require('../src/database/entities/model.entity')
const { ProviderEntity } = require('../src/database/entities/provider.entity')
const { ProviderCredentialEntity } = require('../src/database/entities/provider-credential.entity')
const { ProviderChannelEntity } = require('../src/database/entities/provider-channel.entity')
const { ModelDeploymentEntity } = require('../src/database/entities/model-deployment.entity')
const { ProvidersRepository } = require('../src/providers/providers.repository')
const { ProviderCredentialsRepository } = require('../src/providers/provider-credentials.repository')
const { ProviderChannelsRepository } = require('../src/providers/provider-channels.repository')
const { ModelDeploymentsRepository } = require('../src/providers/model-deployments.repository')
const { CredentialCipherService } = require('../src/providers/credential-cipher.service')
const { ProviderRuntimeService } = require('../src/providers/provider-runtime.service')
const { ProviderConnectivityService } = require('../src/providers/provider-connectivity.service')
const { OpenAICompatibleProviderAdapter } = require('../src/inference/openai-compatible-provider.adapter')
const { ProviderNotDispatchedException } = require('../src/inference/provider-gateway')

async function main() {
  await source.initialize()
  const suffix = randomUUID().slice(0, 8)
  const providerCode = `e2e-${suffix}`
  const secret = `sk-integration-${randomUUID()}`
  const upstreamModelId = `mock-chat-${suffix}`
  const requests = []
  const server = createServer(async (request, response) => {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null
    requests.push({ method: request.method, url: request.url, authorization: request.headers.authorization, internalChannel: request.headers['x-nexus-channel-id'], body })
    if (request.method === 'GET' && request.url === '/v1/models') {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ object: 'list', data: [{ id: upstreamModelId, object: 'model' }] }))
      return
    }
    if (request.method === 'POST' && request.url === '/v1/chat/completions' && body?.stream) {
      response.writeHead(200, { 'content-type': 'text/event-stream' })
      response.write(`data: ${JSON.stringify({ id: 'chunk-1', object: 'chat.completion.chunk', created: 1, model: upstreamModelId, choices: [{ index: 0, delta: { content: 'ok' }, finish_reason: null }] })}\n\n`)
      response.write(`data: ${JSON.stringify({ id: 'chunk-2', object: 'chat.completion.chunk', created: 1, model: upstreamModelId, choices: [], usage: { prompt_tokens: 4, completion_tokens: 1, total_tokens: 5 } })}\n\n`)
      response.end('data: [DONE]\n\n')
      return
    }
    if (request.method === 'POST' && request.url === '/v1/chat/completions') {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({
        id: 'chatcmpl-provider-e2e', object: 'chat.completion', created: 1, model: upstreamModelId,
        choices: [{ index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 },
      }))
      return
    }
    response.writeHead(404).end()
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  let providerId
  let credentialId
  let channelId
  let deploymentId
  try {
    const [user] = await source.query('SELECT id FROM users ORDER BY created_at ASC LIMIT 1')
    const model = await source.getRepository(ModelEntity).findOne({ where: { isEnabled: true }, order: { createdAt: 'ASC' } })
    assert.ok(user && model, 'migrated development user and model are required')

    const configValues = {
      NODE_ENV: 'test',
      PROVIDER_CREDENTIAL_ENV: 'development',
      PROVIDER_OUTBOUND_HOSTS: '127.0.0.1',
      PROVIDER_GATEWAY_TIMEOUT_MS: 5_000,
      ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
      ENCRYPTION_KEY_VERSION: 'integration-v1',
    }
    const config = {
      get: (key, fallback) => configValues[key] ?? fallback,
      getOrThrow: (key) => {
        if (configValues[key] === undefined) throw new Error(`Missing config ${key}`)
        return configValues[key]
      },
    }

    const providerRepository = source.getRepository(ProviderEntity)
    const credentialRepository = source.getRepository(ProviderCredentialEntity)
    const channelRepository = source.getRepository(ProviderChannelEntity)
    const deploymentRepository = source.getRepository(ModelDeploymentEntity)
    const cipher = new CredentialCipherService(config)

    const provider = await providerRepository.save(providerRepository.create({
      code: providerCode, name: `E2E ${suffix}`, protocol: 'openai_compatible',
      baseUrl: `http://127.0.0.1:${server.address().port}/v1`, docsUrl: null,
      capabilities: ['text'], enabled: true, sortOrder: 999, createdByUserId: user.id,
    }))
    providerId = provider.id

    const credentialUuid = randomUUID()
    const encrypted = cipher.encrypt(secret, { id: credentialUuid, provider: providerCode, environment: 'development' })
    const credential = await credentialRepository.save(credentialRepository.create({
      id: credentialUuid, provider: providerCode, environment: 'development', name: `e2e-${suffix}`,
      ...encrypted, secretLastFour: secret.slice(-4), enabled: true, createdByUserId: user.id, rotatedAt: new Date(),
    }))
    credentialId = credential.id
    assert.notEqual(credential.encryptedSecret, secret)
    assert.equal(JSON.stringify(credential).includes(secret), false)

    const channel = await channelRepository.save(channelRepository.create({
      name: `e2e-${suffix}`, provider: providerCode, environment: 'development', credentialId,
      region: 'local', timeoutMs: 5_000, maxConcurrency: 2, enabled: true, createdByUserId: user.id,
    }))
    channelId = channel.id
    const deployment = await deploymentRepository.save(deploymentRepository.create({
      modelId: model.id, channelId, upstreamModelId, priority: 1, weight: 100, enabled: true,
    }))
    deploymentId = deployment.id

    const channels = new ProviderChannelsRepository(channelRepository)
    const deployments = new ModelDeploymentsRepository(deploymentRepository)
    const runtime = new ProviderRuntimeService(channels, new ProvidersRepository(providerRepository), cipher, config)
    const connectivity = new ProviderConnectivityService(deployments, channels, runtime)
    const adapter = new OpenAICompatibleProviderAdapter(config, runtime)
    const target = { provider: providerCode, model: upstreamModelId, channelId, deploymentId, timeoutMs: 5_000 }

    const acceptance = await connectivity.acceptDeployment(deploymentId)
    assert.equal(acceptance.provider, providerCode)
    assert.equal(acceptance.upstreamModelId, upstreamModelId)
    assert.equal(acceptance.jsonCompletion.inputTokens, 3)
    assert.equal(acceptance.streamCompletion.outputTokens, 1)
    assert.equal(acceptance.cancellation.propagated, true)

    const input = { model: model.publicId, messages: [{ role: 'user', content: 'hello' }] }
    const response = await adapter.chat(input, target)
    assert.equal(response.usage.total_tokens, 5)
    assert.equal(response.model, model.publicId)

    const stream = await adapter.streamChat({ ...input, stream: true }, target, new AbortController().signal)
    const chunks = []
    for await (const chunk of stream.chunks) chunks.push(chunk)
    assert.equal(chunks.length, 2)
    assert.equal(chunks[1].usage.total_tokens, 5)

    assert.equal(requests.length, 6)
    assert.ok(requests.every((request) => request.authorization === `Bearer ${secret}`))
    assert.ok(requests.every((request) => request.internalChannel === undefined), 'internal routing identifiers must not be sent to a direct provider')
    assert.equal(requests[1].body.model, upstreamModelId)
    assert.equal(requests[2].body.stream_options.include_usage, true)
    assert.equal(requests[3].body.stream, true)
    assert.equal(requests[4].body.model, upstreamModelId)
    assert.equal(requests[5].body.stream_options.include_usage, true)

    provider.baseUrl = 'https://not-allowed.invalid/v1'
    await providerRepository.save(provider)
    await assert.rejects(adapter.chat(input, target), ProviderNotDispatchedException)
    assert.equal(requests.length, 6, 'blocked outbound host must fail before network dispatch')
    console.log('PASS: encrypted channel credential powers real acceptance, trusted JSON/SSE calls, cancellation, model mapping and outbound blocking')
  } finally {
    if (deploymentId) await source.getRepository(ModelDeploymentEntity).delete(deploymentId)
    if (channelId) await source.getRepository(ProviderChannelEntity).delete(channelId)
    if (credentialId) await source.getRepository(ProviderCredentialEntity).delete(credentialId)
    if (providerId) await source.getRepository(ProviderEntity).delete(providerId)
    await source.destroy()
    await new Promise((resolve) => server.close(resolve))
  }
}

main().catch((error) => {
  console.error('Provider data-plane integration failed.', error)
  process.exitCode = 1
})
