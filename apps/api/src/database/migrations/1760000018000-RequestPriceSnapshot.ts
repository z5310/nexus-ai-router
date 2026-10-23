import { MigrationInterface, QueryRunner } from 'typeorm'

export class RequestPriceSnapshot1760000018000 implements MigrationInterface {
  name = 'RequestPriceSnapshot1760000018000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // Historical requests have no trustworthy captured price; leave them unknown.
    await queryRunner.query('ALTER TABLE request_logs ADD COLUMN price_snapshot jsonb')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE request_logs DROP COLUMN price_snapshot')
  }
}
