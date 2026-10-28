import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource } from '@nestjs/typeorm'
import type { DataSource, EntityManager } from 'typeorm'

/**
 * 这些邮箱来自早期迁移中的本地演示数据。保留记录是为了不破坏历史外键和审计，
 * 但生产环境必须停用身份、工作区、会话和密钥，不能让公开的初始化口令继续有效。
 */
export const SEEDED_IDENTITY_EMAILS = [
  'admin@nexus.cn',
  'demo@nexus.cn',
  'ops@nexus.cn',
  'viewer@nexus.cn',
] as const

const disabledPasswordHash = 'disabled$production-bootstrap$seeded-identity'

export async function disableSeededIdentities(manager: EntityManager): Promise<number> {
  const emails = [...SEEDED_IDENTITY_EMAILS]

  // 先撤销所有可用凭证，再停用工作区和用户。整个调用由外层事务包裹，
  // 任一步失败都会回滚，避免出现“用户已停用但 API Key 仍可用”的中间状态。
  await manager.query(`
    UPDATE auth_sessions session
    SET revoked_at = COALESCE(session.revoked_at, now())
    FROM users seeded
    WHERE session.user_id = seeded.id AND seeded.email = ANY($1::text[])
  `, [emails])
  await manager.query(`
    UPDATE auth_action_tokens token
    SET used_at = COALESCE(token.used_at, now())
    FROM users seeded
    WHERE token.user_id = seeded.id AND seeded.email = ANY($1::text[])
  `, [emails])
  await manager.query(`
    UPDATE api_keys key
    SET revoked_at = COALESCE(key.revoked_at, now()), updated_at = now()
    FROM users seeded
    WHERE key.user_id = seeded.id AND seeded.email = ANY($1::text[])
  `, [emails])
  await manager.query(`
    UPDATE workspaces workspace
    SET status = 'suspended', updated_at = now()
    FROM users seeded
    WHERE workspace.created_by_user_id = seeded.id AND seeded.email = ANY($1::text[])
  `, [emails])
  await manager.query(`
    UPDATE users
    SET status = 'suspended', password_hash = $2, failed_login_count = 0,
        locked_until = NULL, password_changed_at = now(), updated_at = now()
    WHERE email = ANY($1::text[])
  `, [emails, disabledPasswordHash])
  // 不依赖 PostgreSQL 驱动对 UPDATE RETURNING 的返回结构，单独计数便于测试和日志稳定。
  const [{ count }] = await manager.query(`
    SELECT count(*)::int AS count FROM users
    WHERE email = ANY($1::text[]) AND status = 'suspended' AND password_hash = $2
  `, [emails, disabledPasswordHash])
  return count
}

export async function assertNoActiveSeededIdentities(manager: EntityManager): Promise<void> {
  const [unsafe] = await manager.query(`
    SELECT email FROM users
    WHERE email = ANY($1::text[]) AND status = 'active'
    LIMIT 1
  `, [[...SEEDED_IDENTITY_EMAILS]])
  if (unsafe) {
    throw new Error(`生产安全检查失败：演示身份 ${unsafe.email} 仍处于启用状态，请先运行生产迁移作业`)
  }
}

@Injectable()
export class ProductionDatabaseSafetyService implements OnApplicationBootstrap {
  constructor(
    @InjectDataSource() private readonly source: DataSource,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get<string>('NODE_ENV') !== 'production') return
    // API 启动时再次验证数据库，防止运维人员绕过独立迁移作业直接启动旧演示数据。
    await assertNoActiveSeededIdentities(this.source.manager)
  }
}
