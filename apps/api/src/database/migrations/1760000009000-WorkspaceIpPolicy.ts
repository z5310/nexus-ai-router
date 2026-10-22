import { MigrationInterface, QueryRunner } from 'typeorm'

export class WorkspaceIpPolicy1760000009000 implements MigrationInterface {
  name = 'WorkspaceIpPolicy1760000009000'
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE workspaces ADD COLUMN ip_allowlist_enabled boolean NOT NULL DEFAULT false, ADD COLUMN ip_allowlist jsonb NOT NULL DEFAULT '[]'::jsonb")
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE workspaces DROP COLUMN ip_allowlist, DROP COLUMN ip_allowlist_enabled')
  }
}
