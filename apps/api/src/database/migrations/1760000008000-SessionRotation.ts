import { MigrationInterface, QueryRunner } from 'typeorm'

export class SessionRotation1760000008000 implements MigrationInterface {
  name = 'SessionRotation1760000008000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE auth_sessions ADD COLUMN family_id uuid, ADD COLUMN rotated_at timestamptz')
    await queryRunner.query('UPDATE auth_sessions SET family_id = id')
    await queryRunner.query('ALTER TABLE auth_sessions ALTER COLUMN family_id SET NOT NULL')
    await queryRunner.query('CREATE INDEX "IDX_auth_sessions_family" ON auth_sessions (family_id)')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_auth_sessions_family"')
    await queryRunner.query('ALTER TABLE auth_sessions DROP COLUMN rotated_at, DROP COLUMN family_id')
  }
}
