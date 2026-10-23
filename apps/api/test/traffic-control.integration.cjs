// Uses local Redis and a unique short-lived key prefix.
require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { ConfigService } = require('@nestjs/config')
require('dotenv').config({ path: require('node:path').join(__dirname, '../../../.env') })
const { TrafficControlService } = require('../src/traffic-control/traffic-control.service')

async function main() {
  const prefix = `test-${randomUUID()}`
  const config = new ConfigService({ REDIS_URL: process.env.REDIS_URL, TRAFFIC_CONTROL_KEY_PREFIX: prefix })
  const first = new TrafficControlService(config)
  const second = new TrafficControlService(config)
  await Promise.all([first.onModuleInit(), second.onModuleInit()])
  const leases = []
  try {
    assert.equal((await first.consume('rpm', 'shared', 2, 2_000)).remaining, 1)
    assert.equal((await second.consume('rpm', 'shared', 2, 2_000)).remaining, 0)
    await assert.rejects(
      () => first.consume('rpm', 'shared', 2, 2_000),
      (error) => error.getStatus() === 429 && error.retryAfterSeconds >= 1,
      'separate API instances must share one Redis request limit',
    )

    leases.push(await first.acquireConcurrency('workspace', 'shared', 2, 2_000))
    leases.push(await second.acquireConcurrency('workspace', 'shared', 2, 2_000))
    await assert.rejects(
      () => first.acquireConcurrency('workspace', 'shared', 2, 2_000),
      (error) => error.getStatus() === 429,
      'separate API instances must share one concurrency ceiling',
    )
    await leases.shift().release()
    const replacement = await second.acquireConcurrency('workspace', 'shared', 2, 2_000)
    leases.push(replacement)

    const abandoned = await first.acquireConcurrency('recovery', 'shared', 1, 150)
    await new Promise((resolve) => setTimeout(resolve, 250))
    const recovered = await second.acquireConcurrency('recovery', 'shared', 1, 150)
    await Promise.all([abandoned.release(), recovered.release()])
    console.log('PASS: Redis limits are shared across instances, release capacity and recover abandoned leases')
  } finally {
    await Promise.allSettled(leases.map((lease) => lease.release()))
    await Promise.allSettled([first.onModuleDestroy(), second.onModuleDestroy()])
  }
}

main().catch((error) => {
  console.error('Traffic control integration failed; check local Redis.', error)
  process.exitCode = 1
})
