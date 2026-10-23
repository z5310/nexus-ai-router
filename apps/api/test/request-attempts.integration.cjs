require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const source = require('../src/database/data-source').default
const { RequestLogEntity } = require('../src/database/entities/request-log.entity')
const { InferenceAttemptEntity } = require('../src/database/entities/inference-attempt.entity')
const { UsageBucketEntity } = require('../src/database/entities/usage-bucket.entity')
const { DashboardRepository } = require('../src/dashboard/dashboard.repository')
const { DashboardService } = require('../src/dashboard/dashboard.service')

async function main() {
  await source.initialize()
  const requestId = `routing-detail-${randomUUID()}`
  let requestLogId
  try {
    const [workspace] = await source.query('SELECT id, created_by_user_id FROM workspaces ORDER BY created_at ASC LIMIT 1')
    assert.ok(workspace, 'a migrated development workspace is required')
    const requestLogs = source.getRepository(RequestLogEntity)
    const attempts = source.getRepository(InferenceAttemptEntity)
    const log = await requestLogs.save(requestLogs.create({
      workspaceId: workspace.id,
      userId: workspace.created_by_user_id,
      requestId,
      requestedModelPublicId: 'openai/requested',
      modelPublicId: 'deepseek/resolved',
      routeRuleId: null,
      attemptCount: 2,
      firstTokenLatencyMs: 87,
      errorCode: null,
      status: 'success',
      latencyMs: 240,
      inputTokens: 10,
      outputTokens: 20,
      costCny: '0.001200',
    }))
    requestLogId = log.id
    await attempts.save([
      attempts.create({
        requestLogId: log.id,
        workspaceId: workspace.id,
        attemptNumber: 1,
        modelPublicId: 'openai/primary',
        provider: 'openai',
        status: 'failed',
        latencyMs: 120,
        errorCode: 'upstream_502',
        errorMessage: '主供应商暂不可用',
      }),
      attempts.create({
        requestLogId: log.id,
        workspaceId: workspace.id,
        attemptNumber: 2,
        modelPublicId: 'deepseek/resolved',
        provider: 'deepseek',
        status: 'success',
        latencyMs: 120,
        errorCode: null,
        errorMessage: null,
      }),
    ])

    const repository = new DashboardRepository(
      source.getRepository(UsageBucketEntity),
      requestLogs,
      attempts,
    )
    const detail = await new DashboardService(repository).requestDetail(workspace.id, requestId)
    assert.equal(detail.requestedModelId, 'openai/requested')
    assert.equal(detail.modelId, 'deepseek/resolved')
    assert.equal(detail.firstTokenLatencyMs, 87)
    assert.equal(detail.attemptCount, 2)
    assert.deepEqual(detail.attempts.map((item) => item.status), ['failed', 'success'])
    assert.equal(detail.attempts[0].errorCode, 'upstream_502')
    console.log('PASS: request detail and ordered inference attempts round-trip through PostgreSQL')
  } finally {
    if (requestLogId) await source.getRepository(RequestLogEntity).delete(requestLogId)
    await source.destroy()
  }
}

main().catch((error) => {
  console.error('Request attempt integration failed; check PostgreSQL and migrations.', error)
  process.exitCode = 1
})
