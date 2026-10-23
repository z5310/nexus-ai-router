require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const source = require('../src/database/data-source').default
const { AudioGenerationTaskEntity } = require('../src/database/entities/audio-generation-task.entity')
const { AudioGenerationRepository } = require('../src/audio-generation/audio-generation.repository')

function taskInput(actor, model, overrides = {}) {
  return {
    workspaceId: actor.workspace_id, userId: actor.user_id, modelId: model.id,
    modelPublicId: model.public_id, modelName: model.name, status: 'queued',
    prompt: '用于验证音频任务状态流转的测试文本', voice: 'test-voice', instruction: null, language: 'Chinese',
    speechRate: '1.00', pitch: 0, volume: '1.00', sampleRate: 32000, bitrate: 128000,
    responseFormat: 'mp3', provider: model.owner.toLowerCase(), upstreamModelId: model.public_id.split('/').pop(),
    channelId: null, deploymentId: null, resultUrl: null, resultExpiresAt: null, durationMs: null,
    estimatedCostCny: '0.001000', settledCostCny: null, errorCode: null, errorMessage: null,
    startedAt: null, completedAt: null, ...overrides,
  }
}

async function main() {
  await source.initialize()
  const repository = source.getRepository(AudioGenerationTaskEntity)
  const tasks = new AudioGenerationRepository(repository)
  const ids = []
  try {
    const [actor] = await source.query(`SELECT workspace_id, user_id FROM workspace_members WHERE status = 'active' ORDER BY created_at ASC LIMIT 1`)
    const [model] = await source.query(`SELECT id, public_id, name, owner FROM models WHERE model_type = 'audio' AND is_enabled = true ORDER BY created_at ASC LIMIT 1`)
    assert.ok(actor && model, 'an active workspace member and audio model are required')

    const first = await tasks.save(tasks.create(taskInput(actor, model)))
    ids.push(first.id)
    assert.ok(await tasks.findVisible(first.id, actor.workspace_id, actor.user_id))
    assert.equal(await tasks.findVisible(first.id, actor.workspace_id, randomUUID()), null, 'task must be isolated by user')
    assert.equal(await tasks.findVisible(first.id, randomUUID(), actor.user_id), null, 'task must be isolated by workspace')
    assert.equal(await tasks.markProcessing(first.id), true)
    assert.equal(await tasks.markProcessing(first.id), false, 'queued -> processing transition must be idempotent')
    await tasks.markSucceeded(first.id, { url: 'https://cdn.example.test/audio/test.mp3', durationMs: 2500, expiresAt: null })
    const succeeded = await tasks.findById(first.id)
    assert.equal(succeeded.status, 'succeeded')
    assert.equal(succeeded.durationMs, 2500)

    const second = await tasks.save(tasks.create(taskInput(actor, model)))
    ids.push(second.id)
    assert.equal(await tasks.cancel(second.id, actor.workspace_id, randomUUID()), false)
    assert.equal(await tasks.cancel(second.id, actor.workspace_id, actor.user_id), true)
    assert.equal((await tasks.findById(second.id)).status, 'cancelled')

    await assert.rejects(() => tasks.save(tasks.create(taskInput(actor, model, { prompt: '' }))), /prompt|CHK_audio_generation_tasks_prompt/i)
    console.log('PASS: audio tasks persist state transitions and enforce workspace/user isolation')
  } finally {
    if (ids.length) await repository.delete(ids)
    await source.destroy()
  }
}

main().catch((error) => {
  console.error('Audio generation task integration failed; check PostgreSQL and migrations.', error)
  process.exitCode = 1
})
