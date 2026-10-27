require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
const assert = require('node:assert/strict')
const { ObservabilityService } = require('../src/observability/observability.service')
const { HealthController } = require('../src/health/health.controller')

async function main() {
  const metrics = new ObservabilityService()
  metrics.recordHttp('GET', '/api/workspaces/:id', 200, 125)
  metrics.recordInference({
    modelPublicId: 'deepseek-chat', status: 'success', latencyMs: 900, firstTokenLatencyMs: 240,
    attempts: [{ provider: 'deepseek', status: 'success', latencyMs: 880, errorCode: null }],
  })
  const rendered = metrics.render()
  assert.match(rendered, /nexus_http_requests_total\{method="GET",route="\/api\/workspaces\/:id",status_code="200"\} 1/)
  assert.match(rendered, /nexus_inference_first_token_duration_seconds_bucket\{model="deepseek-chat",le="0.25"\} 1/)
  assert.match(rendered, /nexus_provider_attempts_total\{provider="deepseek",status="success",error_code="none"\} 1/)
  assert.doesNotMatch(rendered, /workspace_id|user_id|request_id/)

  const never = () => new Promise(() => {})
  const controller = new HealthController({ query: never }, { ping: async () => undefined }, { get: () => 25 }, metrics)
  const reply = { statusCode: 200, status(code) { this.statusCode = code; return this } }
  const startedAt = performance.now()
  const readiness = await controller.ready(reply)
  assert.equal(reply.statusCode, 503)
  assert.equal(readiness.status, 'degraded')
  assert.equal(readiness.dependencies.postgres.status, 'error')
  assert.equal(readiness.dependencies.redis.status, 'ok')
  assert.ok(performance.now() - startedAt < 250, 'readiness must be bounded by its configured timeout')
  assert.match(metrics.render(), /nexus_dependency_ready\{dependency="postgres"\} 0/)
  console.log('PASS: bounded readiness and low-cardinality Prometheus inference/HTTP metrics')
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
