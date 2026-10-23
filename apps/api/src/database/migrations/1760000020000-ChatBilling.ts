import { MigrationInterface, QueryRunner } from 'typeorm'

export class ChatBilling1760000020000 implements MigrationInterface {
  name = 'ChatBilling1760000020000'

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE billing_reservations
      ADD COLUMN parent_request_id varchar(80),
      ADD COLUMN price_snapshot jsonb,
      ADD COLUMN outcome varchar(20),
      ADD COLUMN actual_micros bigint CHECK (actual_micros >= 0),
      ADD COLUMN input_tokens integer CHECK (input_tokens >= 0),
      ADD COLUMN output_tokens integer CHECK (output_tokens >= 0),
      ADD COLUMN review_reason varchar(120),
      ADD CONSTRAINT billing_chat_outcome CHECK (outcome IS NULL OR outcome IN ('prepared','dispatched','settle','release','review','settled','released'));
      CREATE INDEX billing_chat_pending ON billing_reservations(updated_at) WHERE status = 'held' AND outcome IS NOT NULL;`)
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP INDEX billing_chat_pending;
      ALTER TABLE billing_reservations DROP CONSTRAINT billing_chat_outcome,
      DROP COLUMN parent_request_id, DROP COLUMN price_snapshot, DROP COLUMN outcome,
      DROP COLUMN actual_micros, DROP COLUMN input_tokens, DROP COLUMN output_tokens, DROP COLUMN review_reason;`)
  }
}
