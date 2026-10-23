require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { BadGatewayException } = require('@nestjs/common')
const { InferenceService } = require('../src/inference/inference.service')
const { RoutingExecutorService } = require('../src/inference/routing-executor.service')

function configuredModel(publicId, owner, inputPrice, outputPrice, latencyMs) {
  return {
    id: randomUUID(),
    workspaceId: randomUUID(),
    rateLimitRpm: 100,
    priority: 50,
    enabled: true,
    model: {
      publicId,
      owner,
      modelType: 'text',
      isEnabled: true,
      inputPrice: String(inputPrice),
      outputPrice: String(outputPrice),
      latencyMs,
    },
  }
}

async function verifyDecisionOrdering() {
  const expensive = configuredModel('openai/expensive', 'OpenAI', 20, 40, 100)
  const economical = configuredModel('deepseek/economical', 'DeepSeek', 1, 2, 300)
  const rule = {
    id: randomUUID(),
    name: '成本优先',
    enabled: true,
    matchType: 'text',
    strategy: 'lowest_cost',
    trafficPercent: 100,
    primaryModel: expensive,
    fallbackModel: economical,
    createdAt: new Date(),
  }
  const executor = new RoutingExecutorService(
    { findRoutableModel: async () => expensive },
    { find: async () => [rule] },
  )
  const decision = await executor.resolve(expensive.workspaceId, expensive.model.publicId, 'decision-request')
  assert.equal(decision.routeRuleId, rule.id)
  assert.deepEqual(decision.candidates.map((item) => item.model.publicId), ['deepseek/economical', 'openai/expensive'])
}

async function verifyFallbackAndAttemptChain() {
  const primary = configuredModel('openai/primary', 'OpenAI', 10, 20, 100)
  const fallback = configuredModel('deepseek/fallback', 'DeepSeek', 1, 2, 200)
  const routeRuleId = randomUUID()
  const decision = { requested: primary, routeRuleId, routeRuleName: '默认文本路由', candidates: [primary, fallback] }
  const records = []
  const calls = []
  const response = {
    id: 'chatcmpl-route-test',
    object: 'chat.completion',
    created: 1,
    model: 'fallback',
    choices: [{ index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  }
  const provider = {
    chat: async (_input, target) => {
      calls.push(`chat:${target.provider}`)
      if (target.provider === 'openai') throw new BadGatewayException('主供应商暂不可用')
      return response
    },
    streamChat: async (_input, target) => {
      calls.push(`stream:${target.provider}`)
      if (target.provider === 'openai') throw new BadGatewayException('主供应商暂不可用')
      return {
        chunks: (async function* () {
          yield { id: 'chunk-1', object: 'chat.completion.chunk', created: 1, model: 'fallback', choices: [] }
          yield {
            id: 'chunk-2',
            object: 'chat.completion.chunk',
            created: 1,
            model: 'fallback',
            choices: [],
            usage: { prompt_tokens: 4, completion_tokens: 3, total_tokens: 7 },
          }
        })(),
        cancel: () => {},
      }
    },
  }
  const traffic = {
    consume: async () => ({ remaining: 99, resetAt: Date.now() + 60_000 }),
    acquireConcurrency: async () => ({ release: async () => {} }),
  }
  const service = new InferenceService(
    { record: async (entry) => { records.push(structuredClone(entry)) } },
    provider,
    traffic,
    { get: (_key, fallbackValue) => fallbackValue },
    { resolve: async () => decision },
  )
  const input = { model: primary.model.publicId, messages: [{ role: 'user', content: 'hello' }], stream: false }
  const key = { workspaceId: primary.workspaceId, userId: randomUUID() }

  const result = await service.chat(input, key, 'route-chat-request')
  assert.equal(result.model, fallback.model.publicId)
  assert.deepEqual(calls.slice(0, 2), ['chat:openai', 'chat:deepseek'])
  assert.equal(records[0].routeRuleId, routeRuleId)
  assert.equal(records[0].requestedModelPublicId, primary.model.publicId)
  assert.equal(records[0].modelPublicId, fallback.model.publicId)
  assert.deepEqual(records[0].attempts.map((item) => item.status), ['failed', 'success'])
  assert.equal(records[0].attempts[0].errorCode, 'upstream_502')

  const stream = await service.streamChat({ ...input, stream: true }, key, new AbortController().signal, 'route-stream-request')
  const chunks = []
  for await (const chunk of stream.chunks) chunks.push(chunk)
  assert.equal(chunks.length, 2)
  assert.ok(chunks.every((chunk) => chunk.model === fallback.model.publicId))
  assert.deepEqual(calls.slice(2), ['stream:openai', 'stream:deepseek'])
  assert.deepEqual(records[1].attempts.map((item) => item.status), ['failed', 'success'])
  assert.ok(records[1].firstTokenLatencyMs >= 0)
  assert.equal(records[1].inputTokens, 4)
  assert.equal(records[1].outputTokens, 3)
}

async function main() {
  await verifyDecisionOrdering()
  await verifyFallbackAndAttemptChain()
  console.log('PASS: routing strategy, pre-stream fallback and attempt-chain recording work together')
}

main().catch((error) => {
  console.error('Routing execution integration failed.', error)
  process.exitCode = 1
})
