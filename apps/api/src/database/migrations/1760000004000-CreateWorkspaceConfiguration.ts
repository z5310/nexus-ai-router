import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateWorkspaceConfiguration1760000004000 implements MigrationInterface {
  name = 'CreateWorkspaceConfiguration1760000004000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "api_keys" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "name" varchar(80) NOT NULL,
        "key_hash" varchar(64) NOT NULL,
        "key_prefix" varchar(16) NOT NULL,
        "last_four" varchar(4) NOT NULL,
        "last_used_at" timestamptz,
        "revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_api_keys" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_api_keys_hash" UNIQUE ("key_hash"),
        CONSTRAINT "FK_api_keys_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`CREATE INDEX "IDX_api_keys_user_name" ON "api_keys" ("user_id", "name")`)
    await queryRunner.query(`CREATE INDEX "IDX_api_keys_user_active" ON "api_keys" ("user_id", "revoked_at")`)

    await queryRunner.query(`
      CREATE TABLE "workspace_models" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "model_id" uuid NOT NULL,
        "alias" varchar(120),
        "priority" integer NOT NULL DEFAULT 50,
        "rate_limit_rpm" integer NOT NULL DEFAULT 60,
        "daily_budget_cny" numeric(12,2),
        "enabled" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workspace_models" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_workspace_models_user_model" UNIQUE ("user_id", "model_id"),
        CONSTRAINT "FK_workspace_models_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workspace_models_model" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_workspace_models_priority" CHECK ("priority" BETWEEN 1 AND 100),
        CONSTRAINT "CHK_workspace_models_rpm" CHECK ("rate_limit_rpm" BETWEEN 1 AND 100000)
      )
    `)
    await queryRunner.query(`CREATE INDEX "IDX_workspace_models_user_enabled" ON "workspace_models" ("user_id", "enabled")`)
    await queryRunner.query(`
      INSERT INTO "workspace_models" ("user_id", "model_id", "priority", "rate_limit_rpm")
      SELECT u."id", m."id", 50, 60
      FROM "users" u
      CROSS JOIN LATERAL (
        SELECT "id" FROM "models"
        WHERE "is_enabled" = true
        ORDER BY "is_featured" DESC, "overall_score" DESC
        LIMIT 3
      ) m
      WHERE u."email" = 'demo@nexus.cn'
      ON CONFLICT ("user_id", "model_id") DO NOTHING
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "workspace_models"`)
    await queryRunner.query(`DROP TABLE "api_keys"`)
  }
}
