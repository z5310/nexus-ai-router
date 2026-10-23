import { MigrationInterface, QueryRunner } from 'typeorm'

export class BillingAdminAudit1760000021000 implements MigrationInterface {
  name = 'BillingAdminAudit1760000021000'
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE billing_admin_actions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id uuid NOT NULL REFERENCES billing_accounts(workspace_id) ON DELETE RESTRICT,
      operation_id uuid NOT NULL,
      kind varchar(24) NOT NULL CHECK (kind IN ('grant','manual_settle','manual_release')),
      actor_user_id uuid NOT NULL,
      actor_name varchar(120) NOT NULL,
      reason varchar(500) NOT NULL,
      evidence varchar(200) NOT NULL,
      reference varchar(120),
      payload jsonb NOT NULL,
      before_state jsonb NOT NULL,
      result jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (workspace_id, operation_id)
    );
    CREATE INDEX billing_admin_actions_workspace ON billing_admin_actions(workspace_id, created_at DESC);
    CREATE TRIGGER billing_admin_actions_immutable BEFORE UPDATE OR DELETE ON billing_admin_actions
      FOR EACH ROW EXECUTE FUNCTION billing_reject_ledger_mutation();
    CREATE TRIGGER billing_admin_actions_no_truncate BEFORE TRUNCATE ON billing_admin_actions
      FOR EACH STATEMENT EXECUTE FUNCTION billing_reject_ledger_mutation();`)
  }
  async down(runner: QueryRunner): Promise<void> {
    const [row] = await runner.query('SELECT 1 FROM billing_admin_actions LIMIT 1')
    if (row) throw new Error('存在财务审计记录，不允许删除历史审计')
    await runner.query('DROP TABLE billing_admin_actions')
  }
}
