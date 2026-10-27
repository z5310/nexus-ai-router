import { MigrationInterface, QueryRunner } from 'typeorm'

export class BillingUsageIndex1760000025000 implements MigrationInterface {
  name = 'BillingUsageIndex1760000025000'

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE INDEX billing_ledger_workspace_created_at
      ON billing_ledger(workspace_id, created_at DESC, id DESC)`)
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP INDEX billing_ledger_workspace_created_at')
  }
}
