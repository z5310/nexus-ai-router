require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
const assert = require('node:assert/strict')
const Fastify = require('fastify')
const { parseTrustedProxyCidrs } = require('../src/config/trusted-proxy')

async function resolvedIp(trustProxy, remoteAddress, forwardedFor) {
  const app = Fastify({ trustProxy })
  app.get('/', async (request) => ({ ip: request.ip, ips: request.ips }))
  const response = await app.inject({
    method: 'GET',
    url: '/',
    remoteAddress,
    headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {},
  })
  await app.close()
  return response.json()
}

async function main() {
  assert.equal(parseTrustedProxyCidrs(undefined), false)
  assert.deepEqual(parseTrustedProxyCidrs('10.0.0.0/8, 192.168.0.0/16'), ['10.0.0.0/8', '192.168.0.0/16'])
  assert.throws(() => parseTrustedProxyCidrs('10.0.0.0/33'), /Invalid trusted proxy CIDR/)
  assert.throws(() => parseTrustedProxyCidrs('not-a-network'), /Invalid trusted proxy CIDR/)

  const direct = await resolvedIp(false, '203.0.113.10', '198.51.100.8')
  assert.equal(direct.ip, '203.0.113.10', 'an untrusted peer cannot spoof its client IP header')

  const wrongProxy = await resolvedIp(parseTrustedProxyCidrs('10.0.0.0/8'), '203.0.113.10', '198.51.100.8')
  assert.equal(wrongProxy.ip, '203.0.113.10', 'forwarded headers are ignored outside the configured proxy CIDR')

  const trusted = await resolvedIp(parseTrustedProxyCidrs('10.0.0.0/8'), '10.0.0.2', '198.51.100.8')
  assert.equal(trusted.ip, '198.51.100.8', 'a trusted proxy can report the original client')

  const chain = await resolvedIp(parseTrustedProxyCidrs('10.0.0.0/8'), '10.0.0.2', '198.51.100.8, 10.0.0.3')
  assert.equal(chain.ip, '198.51.100.8', 'the first untrusted address is selected through a trusted proxy chain')
  console.log('PASS: trusted proxy CIDRs prevent forwarded-header spoofing and preserve real client IPs')
}

main().catch((error) => {
  console.error('Trusted proxy test failed.', error)
  process.exitCode = 1
})
