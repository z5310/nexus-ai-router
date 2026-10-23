// Uses local Redis with in-memory provider/repository doubles to verify the inference lifecycle.
require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { ConfigService } = require('@nestjs/config')
require('dotenv').config({ path: require('node:path').join(__dirname, '../../../.env') })
const { InferenceService } = require('../src/inference/inference.service')
const { TrafficControlService } = require('../src/traffic-control/traffic-control.service')

const response = {
  id: 'chatcmpl-test',
  object: 'chat.completion',
  created: 1,
  model: 'test',
  choices: [{ index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
}

async function main() {
  const config = new ConfigService({
    REDIS_URL: process.env.REDIS_URL,
    TRAFFIC_CONTROL_KEY_PREFIX: `inference-test-${randomUUID()}`,
    INFERENCE_MAX_CONCURRENCY_PER_WORKSPACE: 1,
    INFERENCE_CONCURRENCY_LEASE_MS: 2_000,
  })
  const traffic = new TrafficControlService(config)
  await traffic.onModuleInit()
  let releaseFirst
  let firstStarted
  const started = new Promise((resolve) => { firstStarted = resolve })
  let calls = 0
  const provider = {
    chat: async () => {
      calls += 1
      if (calls !== 1) return response
      firstStarted()
      return new Promise((resolve) => { releaseFirst = () => resolve(response) })
    },
    streamChat: async () => ({
      chunks: (async function* () { yield { id: 'chunk', object: 'chat.completion.chunk', created: 1, model: 'test', choices: [] } })(),
      cancel: () => {},
    }),
  }
  const records = []
  const configuredModel = {
    id: randomUUID(),
    rateLimitRpm: 100,
    enabled: true,
    model: { publicId: 'openai/test', owner: 'OpenAI', modelType: 'text', isEnabled: true, inputPrice: '0', outputPrice: '0', latencyMs: 1 },
  }
  const repository = {
    capturePrice: async () => ({ priceUnit: 'million_tokens', inputPrice: '0', outputPrice: '0' }),
    record: async (entry) => { records.push(entry) },
  }
  const routing = {
    resolve: async () => ({ requested: configuredModel, routeRuleId: null, routeRuleName: null, candidates: [configuredModel] }),
  }
  const deployments = {
    resolveTargets: async (model) => [{ provider: model.owner.toLowerCase(), model: model.publicId.split('/').at(-1) }],
    recordResult: async () => {},
  }
  const service = new InferenceService(repository, provider, traffic, config, routing, deployments)
  const input = { model: 'openai/test', messages: [{ role: 'user', content: 'hello' }], stream: false }
  const key = { workspaceId: randomUUID(), userId: randomUUID() }

  try {
    const first = service.chat(input, key, 'request-1')
    await started
    await assert.rejects(
      () => service.chat(input, key, 'request-2'),
      (error) => error.getStatus() === 429,
      'a second inference is rejected while the workspace lease is occupied',
    )
    releaseFirst()
    await first
    await service.chat(input, key, 'request-3')

    const stream = await service.streamChat({ ...input, stream: true }, key, new AbortController().signal, 'request-4')
    await assert.rejects(
      () => service.chat(input, key, 'request-5'),
      (error) => error.getStatus() === 429,
      'a live stream holds the same workspace concurrency lease',
    )
    stream.cancel()
    await service.chat(input, key, 'request-6')
    assert.equal(records.filter((entry) => entry.status === 'success').length, 3)
    console.log('PASS: non-streaming and streaming inference share and release the Redis workspace lease')
  } finally {
    await traffic.onModuleDestroy()
  }
}

main().catch((error) => {
  console.error('Inference concurrency integration failed; check local Redis.', error)
  process.exitCode = 1
})
