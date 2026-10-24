import { MigrationInterface, QueryRunner } from 'typeorm'

export class InferenceIdempotency1760000024000 implements MigrationInterface {
  name = 'InferenceIdempotency1760000024000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "inference_idempotency" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL,
        "key_hash" varchar(64) NOT NULL,
        "request_hash" varchar(64) NOT NULL,
        "request_id" varchar(80) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "response" jsonb,
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inference_idempotency" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inference_idempotency_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_inference_idempotency_status" CHECK ("status" IN ('pending','completed','failed')),
        CONSTRAINT "CHK_inference_idempotency_response" CHECK (("status" = 'completed') = ("response" IS NOT NULL))
      )
    `)
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_inference_idempotency_workspace_key" ON "inference_idempotency" ("workspace_id", "key_hash")')
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_inference_idempotency_request" ON "inference_idempotency" ("request_id")')
    await queryRunner.query('CREATE INDEX "IDX_inference_idempotency_expires" ON "inference_idempotency" ("expires_at")')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "inference_idempotency"')
  }
}
