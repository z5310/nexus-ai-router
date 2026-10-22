import { MigrationInterface, QueryRunner } from 'typeorm'

export class HardenIdentity1760000003000 implements MigrationInterface {
  name = 'HardenIdentity1760000003000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "failed_login_count" integer NOT NULL DEFAULT 0`)
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "locked_until" timestamptz`)
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "password_changed_at" timestamptz`)
    await queryRunner.query(`ALTER TABLE "auth_sessions" ADD COLUMN "user_agent" text`)
    await queryRunner.query(`ALTER TABLE "auth_sessions" ADD COLUMN "ip_address" varchar(64)`)
    await queryRunner.query(`ALTER TABLE "auth_sessions" ADD COLUMN "last_seen_at" timestamptz NOT NULL DEFAULT now()`)
    await queryRunner.query(`
      CREATE TABLE "auth_action_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "purpose" varchar(32) NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_action_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_auth_action_tokens_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "CHK_auth_action_tokens_purpose" CHECK ("purpose" IN ('password_reset')),
        CONSTRAINT "FK_auth_action_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`CREATE INDEX "IDX_auth_action_tokens_user_purpose_expires" ON "auth_action_tokens" ("user_id", "purpose", "expires_at")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "auth_action_tokens"`)
    await queryRunner.query(`ALTER TABLE "auth_sessions" DROP COLUMN "last_seen_at"`)
    await queryRunner.query(`ALTER TABLE "auth_sessions" DROP COLUMN "ip_address"`)
    await queryRunner.query(`ALTER TABLE "auth_sessions" DROP COLUMN "user_agent"`)
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_changed_at"`)
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "locked_until"`)
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "failed_login_count"`)
  }
}
