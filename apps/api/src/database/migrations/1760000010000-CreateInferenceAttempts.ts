import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateInferenceAttempts1760000010000 implements MigrationInterface {
  name = 'CreateInferenceAttempts1760000010000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "request_logs"
        ADD COLUMN "requested_model_public_id" varchar(120),
        ADD COLUMN "route_rule_id" uuid,
        ADD COLUMN "attempt_count" smallint NOT NULL DEFAULT 1,
        ADD COLUMN "first_token_latency_ms" integer,
        ADD COLUMN "error_code" varchar(80),
        ADD CONSTRAINT "FK_request_logs_route_rule" FOREIGN KEY ("route_rule_id") REFERENCES "route_rules"("id") ON DELETE SET NULL
    `)
    await queryRunner.query('UPDATE "request_logs" SET "requested_model_public_id" = "model_public_id"')
    await queryRunner.query('ALTER TABLE "request_logs" ALTER COLUMN "requested_model_public_id" SET NOT NULL')
    await queryRunner.query(`
      CREATE TABLE "inference_attempts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "request_log_id" uuid NOT NULL,
        "workspace_id" uuid NOT NULL,
        "attempt_number" smallint NOT NULL,
        "model_public_id" varchar(120) NOT NULL,
        "provider" varchar(60) NOT NULL,
        "status" varchar(20) NOT NULL,
        "latency_ms" integer NOT NULL,
        "error_code" varchar(80),
        "error_message" varchar(300),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inference_attempts" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_inference_attempts_status" CHECK ("status" IN ('success','failed','cancelled')),
        CONSTRAINT "FK_inference_attempts_request_log" FOREIGN KEY ("request_log_id") REFERENCES "request_logs"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_inference_attempt_request_number" ON "inference_attempts" ("request_log_id", "attempt_number")')
    await queryRunner.query('CREATE INDEX "IDX_inference_attempt_workspace_created" ON "inference_attempts" ("workspace_id", "created_at")')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "inference_attempts"')
    await queryRunner.query('ALTER TABLE "request_logs" DROP CONSTRAINT "FK_request_logs_route_rule"')
    await queryRunner.query(`
      ALTER TABLE "request_logs"
        DROP COLUMN "error_code",
        DROP COLUMN "first_token_latency_ms",
        DROP COLUMN "attempt_count",
        DROP COLUMN "route_rule_id",
        DROP COLUMN "requested_model_public_id"
    `)
  }
}
