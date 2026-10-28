require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json') })
require('reflect-metadata')
const assert = require('node:assert/strict')
const source = require('../src/database/data-source').default
const {
  SEEDED_IDENTITY_EMAILS,
  assertNoActiveSeededIdentities,
  disableSeededIdentities,
} = require('../src/config/production-database-safety')

async function main() {
  await source.initialize()
  const runner = source.createQueryRunner()
  await runner.startTransaction()
  try {
    // 测试在事务中模拟生产清理，结束后回滚，不改变开发者本地的演示登录状态。
    await runner.manager.query("UPDATE users SET status = 'active' WHERE email = ANY($1::text[])", [[...SEEDED_IDENTITY_EMAILS]])
    const [{ count: existingCount }] = await runner.manager.query(
      'SELECT count(*)::int AS count FROM users WHERE email = ANY($1::text[])',
      [[...SEEDED_IDENTITY_EMAILS]],
    )
    assert.ok(existingCount > 0, '至少需要一条历史演示身份来验证生产清理')
    const [fixture] = await runner.manager.query(`
      SELECT seeded.id AS user_id, workspace.id AS workspace_id
      FROM users seeded
      JOIN workspaces workspace ON workspace.created_by_user_id = seeded.id
      WHERE seeded.email = ANY($1::text[])
      LIMIT 1
    `, [[...SEEDED_IDENTITY_EMAILS]])
    assert.ok(fixture, '演示身份应有对应工作区')
    const [session] = await runner.manager.query(`
      INSERT INTO auth_sessions (user_id, token_hash, family_id, expires_at)
      VALUES ($1, repeat('a', 64), gen_random_uuid(), now() + interval '1 day')
      RETURNING id
    `, [fixture.user_id])
    const [actionToken] = await runner.manager.query(`
      INSERT INTO auth_action_tokens (user_id, purpose, token_hash, expires_at)
      VALUES ($1, 'password_reset', repeat('b', 64), now() + interval '15 minutes')
      RETURNING id
    `, [fixture.user_id])
    const [apiKey] = await runner.manager.query(`
      INSERT INTO api_keys (user_id, workspace_id, name, key_hash, key_prefix, last_four)
      VALUES ($1, $2, 'production-safety-test', repeat('c', 64), 'nxs_test_fixture', '0000')
      RETURNING id
    `, [fixture.user_id, fixture.workspace_id])
    const disabled = await disableSeededIdentities(runner.manager)
    assert.equal(disabled, existingCount)

    const users = await runner.manager.query('SELECT email, status, password_hash FROM users WHERE email = ANY($1::text[])', [[...SEEDED_IDENTITY_EMAILS]])
    assert.equal(users.length, existingCount)
    assert.ok(users.every((user) => user.status === 'suspended'))
    assert.ok(users.every((user) => user.password_hash.startsWith('disabled$')))
    const workspaces = await runner.manager.query(`
      SELECT workspace.status FROM workspaces workspace
      JOIN users seeded ON seeded.id = workspace.created_by_user_id
      WHERE seeded.email = ANY($1::text[])
    `, [[...SEEDED_IDENTITY_EMAILS]])
    assert.ok(workspaces.every((workspace) => workspace.status === 'suspended'))
    // 同一个 QueryRunner 绑定单条数据库连接，按顺序读取，避免并发复用客户端。
    const [revokedSession] = await runner.manager.query('SELECT revoked_at FROM auth_sessions WHERE id = $1', [session.id])
    const [usedActionToken] = await runner.manager.query('SELECT used_at FROM auth_action_tokens WHERE id = $1', [actionToken.id])
    const [revokedApiKey] = await runner.manager.query('SELECT revoked_at FROM api_keys WHERE id = $1', [apiKey.id])
    assert.ok(revokedSession.revoked_at)
    assert.ok(usedActionToken.used_at)
    assert.ok(revokedApiKey.revoked_at)
    await assertNoActiveSeededIdentities(runner.manager)

    await runner.manager.query("UPDATE users SET status = 'active' WHERE email = $1", [SEEDED_IDENTITY_EMAILS[0]])
    await assert.rejects(() => assertNoActiveSeededIdentities(runner.manager), /演示身份/)
    console.log('PASS: production bootstrap disables seeded identities, credentials and workspaces')
  } finally {
    await runner.rollbackTransaction()
    await runner.release()
    await source.destroy()
  }
}

main().catch((error) => {
  console.error('Production database safety integration failed.', error)
  process.exitCode = 1
})
