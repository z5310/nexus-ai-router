require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createServer } = require('node:http')
const { OpenAICompatibleProviderAdapter } = require('../src/inference/openai-compatible-provider.adapter')
const { ProviderNotDispatchedException } = require('../src/inference/provider-gateway')
const { ProviderDispatchNotStartedError } = require('../src/providers/provider-runtime.service')

test('provider requires trustworthy JSON usage and a complete SSE terminator', async () => {
  let mode = 'json'
  const usage = { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 }
  const server = createServer((_req, res) => {
    if (mode.startsWith('sse')) {
      res.writeHead(200, { 'content-type': 'text/event-stream' })
      res.write(`data: ${JSON.stringify({ choices: [], usage })}\n\n`)
      if (mode === 'sse-complete') res.write('data: [DONE]\n\n')
      res.end()
    } else {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ choices: [], ...(mode === 'json' ? { usage } : {}) }))
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const config = { get: (_key, fallback) => fallback }
    const runtime = { dispatch: (_target, path, init) => fetch(`http://127.0.0.1:${server.address().port}/${path}`, init) }
    const adapter = new OpenAICompatibleProviderAdapter(config, runtime)
    const input = { model: 'test/model', messages: [{ role: 'user', content: 'test' }] }
    const target = { provider: 'test', model: 'test' }
    assert.deepEqual((await adapter.chat(input, target)).usage, usage)
    mode = 'json-no-usage'
    await assert.rejects(adapter.chat(input, target), { status: 502 })
    mode = 'sse-complete'
    const complete = await adapter.streamChat(input, target, new AbortController().signal)
    const chunks = []
    for await (const chunk of complete.chunks) chunks.push(chunk)
    assert.equal(chunks.length, 1)
    mode = 'sse-truncated'
    const truncated = await adapter.streamChat(input, target, new AbortController().signal)
    await assert.rejects(async () => { for await (const chunk of truncated.chunks) assert.ok(chunk) }, { status: 502 })
    const abort = new AbortController(); abort.abort()
    await assert.rejects(adapter.streamChat(input, target, abort.signal), ProviderNotDispatchedException)
    const unavailable = { dispatch: async () => { throw new ProviderDispatchNotStartedError('not configured') } }
    await assert.rejects(new OpenAICompatibleProviderAdapter(config, unavailable).chat(input, target), ProviderNotDispatchedException)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
