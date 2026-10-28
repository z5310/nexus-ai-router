require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { validateEnvironment } = require('../src/config/env')

const validProduction = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://gateway:secret@postgres:5432/gateway',
  REDIS_URL: 'redis://redis:6379',
  WEB_ORIGIN: 'https://nexus.example.com',
  ADMIN_ORIGIN: 'https://admin.nexus.example.com',
  OAUTH_CALLBACK_ORIGIN: 'https://nexus.example.com',
  JWT_SECRET: '9dK7vP2sQ4mN8xR6tY3wF5hJ1cB0aL2uZ7eG9iO6',
  ENCRYPTION_KEY: Buffer.alloc(32, 19).toString('base64'),
  ENCRYPTION_KEY_VERSION: 'production-v1',
  PROVIDER_CREDENTIAL_ENV: 'production',
  TRUSTED_PROXY_CIDRS: '172.16.0.0/12',
}

test('生产环境接受完整的 HTTPS、随机密钥和凭证隔离配置', () => {
  assert.equal(validateEnvironment(validProduction).NODE_ENV, 'production')
})

test('生产环境拒绝 HTTP、示例密钥、开发凭证和缺失可信代理', () => {
  const unsafe = {
    ...validProduction,
    WEB_ORIGIN: 'http://nexus.example.com',
    JWT_SECRET: 'replace-with-at-least-32-random-characters',
    ENCRYPTION_KEY: 'replace-with-a-32-byte-base64-key',
    ENCRYPTION_KEY_VERSION: 'local-v1',
    PROVIDER_CREDENTIAL_ENV: 'development',
    TRUSTED_PROXY_CIDRS: '',
  }
  assert.throws(() => validateEnvironment(unsafe), (error) => {
    assert.match(error.message, /WEB_ORIGIN/)
    assert.match(error.message, /JWT_SECRET/)
    assert.match(error.message, /ENCRYPTION_KEY/)
    assert.match(error.message, /ENCRYPTION_KEY_VERSION/)
    assert.match(error.message, /PROVIDER_CREDENTIAL_ENV/)
    assert.match(error.message, /TRUSTED_PROXY_CIDRS/)
    return true
  })
})

test('开发环境继续允许本地 HTTP 和演示配置', () => {
  assert.equal(validateEnvironment({
    NODE_ENV: 'development',
    DATABASE_URL: validProduction.DATABASE_URL,
    REDIS_URL: validProduction.REDIS_URL,
    JWT_SECRET: 'replace-with-at-least-32-random-characters',
    ENCRYPTION_KEY: 'replace-with-a-32-byte-base64-key',
  }).NODE_ENV, 'development')
})
