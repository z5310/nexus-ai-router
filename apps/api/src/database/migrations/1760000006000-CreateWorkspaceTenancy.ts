import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateWorkspaceTenancy1760000006000 implements MigrationInterface {
  name = 'CreateWorkspaceTenancy1760000006000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "workspaces" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL,
        "slug" varchar(100) NOT NULL,
        "default_currency" varchar(3) NOT NULL DEFAULT 'CNY',
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "created_by_user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workspaces" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_workspaces_slug" UNIQUE ("slug"),
        CONSTRAINT "FK_workspaces_creator" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_workspaces_status" CHECK ("status" IN ('active','suspended'))
      )
    `)
    await queryRunner.query(`
      CREATE TABLE "workspace_members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" varchar(20) NOT NULL DEFAULT 'developer',
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workspace_members" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_workspace_members_workspace_user" UNIQUE ("workspace_id", "user_id"),
        CONSTRAINT "FK_workspace_members_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workspace_members_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_workspace_members_role" CHECK ("role" IN ('owner','admin','developer','billing','viewer')),
        CONSTRAINT "CHK_workspace_members_status" CHECK ("status" IN ('active','invited'))
      )
    `)
    await queryRunner.query(`CREATE INDEX "IDX_workspace_members_user_status" ON "workspace_members" ("user_id", "status")`)
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "slug" varchar(100) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_projects" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_projects_workspace_slug" UNIQUE ("workspace_id", "slug"),
        CONSTRAINT "FK_projects_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_projects_status" CHECK ("status" IN ('active','archived'))
      )
    `)

    await queryRunner.query(`
      INSERT INTO "workspaces" ("name", "slug", "created_by_user_id")
      SELECT
        CASE
          WHEN trim("name") = '' THEN 'Nexus 工作区'
          WHEN trim("name") LIKE '%工作区' THEN trim("name")
          ELSE trim("name") || ' 的工作区'
        END,
        COALESCE(NULLIF(lower(regexp_replace(split_part("email", '@', 1), '[^a-zA-Z0-9]+', '-', 'g')), ''), 'workspace') || '-' || substring("id"::text, 1, 8),
        "id"
      FROM "users"
    `)
    await queryRunner.query(`
      INSERT INTO "workspace_members" ("workspace_id", "user_id", "role", "status")
      SELECT "id", "created_by_user_id", 'owner', 'active' FROM "workspaces"
    `)
    await queryRunner.query(`
      INSERT INTO "projects" ("workspace_id", "name", "slug", "status")
      SELECT "id", 'Default Project', 'default', 'active' FROM "workspaces"
    `)

    for (const table of ['api_keys', 'workspace_models', 'route_rules', 'request_logs', 'usage_buckets']) {
      await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "workspace_id" uuid`)
      await queryRunner.query(`
        UPDATE "${table}" target
        SET "workspace_id" = member."workspace_id"
        FROM "workspace_members" member
        WHERE member."user_id" = target."user_id" AND member."role" = 'owner'
      `)
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "workspace_id" SET NOT NULL`)
      await queryRunner.query(`ALTER TABLE "${table}" ADD CONSTRAINT "FK_${table}_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE`)
    }

    await queryRunner.query(`DROP INDEX "IDX_api_keys_user_name"`)
    await queryRunner.query(`DROP INDEX "IDX_api_keys_user_active"`)
    await queryRunner.query(`CREATE INDEX "IDX_api_keys_workspace_name" ON "api_keys" ("workspace_id", "name")`)
    await queryRunner.query(`CREATE INDEX "IDX_api_keys_workspace_active" ON "api_keys" ("workspace_id", "revoked_at")`)

    await queryRunner.query(`ALTER TABLE "workspace_models" DROP CONSTRAINT "UQ_workspace_models_user_model"`)
    await queryRunner.query(`DROP INDEX "IDX_workspace_models_user_enabled"`)
    await queryRunner.query(`ALTER TABLE "workspace_models" ADD CONSTRAINT "UQ_workspace_models_workspace_model" UNIQUE ("workspace_id", "model_id")`)
    await queryRunner.query(`CREATE INDEX "IDX_workspace_models_workspace_enabled" ON "workspace_models" ("workspace_id", "enabled")`)

    await queryRunner.query(`ALTER TABLE "route_rules" DROP CONSTRAINT "UQ_route_rules_user_name"`)
    await queryRunner.query(`DROP INDEX "IDX_route_rules_user_enabled"`)
    await queryRunner.query(`ALTER TABLE "route_rules" ADD CONSTRAINT "UQ_route_rules_workspace_name" UNIQUE ("workspace_id", "name")`)
    await queryRunner.query(`CREATE INDEX "IDX_route_rules_workspace_enabled" ON "route_rules" ("workspace_id", "enabled")`)

    await queryRunner.query(`DROP INDEX "IDX_request_logs_user_created"`)
    await queryRunner.query(`CREATE INDEX "IDX_request_logs_workspace_created" ON "request_logs" ("workspace_id", "created_at")`)
    await queryRunner.query(`DROP INDEX "IDX_usage_buckets_user_bucket"`)
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_usage_buckets_workspace_bucket" ON "usage_buckets" ("workspace_id", "bucket_start")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_usage_buckets_workspace_bucket"`)
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_usage_buckets_user_bucket" ON "usage_buckets" ("user_id", "bucket_start")`)
    await queryRunner.query(`DROP INDEX "IDX_request_logs_workspace_created"`)
    await queryRunner.query(`CREATE INDEX "IDX_request_logs_user_created" ON "request_logs" ("user_id", "created_at")`)

    await queryRunner.query(`DROP INDEX "IDX_route_rules_workspace_enabled"`)
    await queryRunner.query(`ALTER TABLE "route_rules" DROP CONSTRAINT "UQ_route_rules_workspace_name"`)
    await queryRunner.query(`ALTER TABLE "route_rules" ADD CONSTRAINT "UQ_route_rules_user_name" UNIQUE ("user_id", "name")`)
    await queryRunner.query(`CREATE INDEX "IDX_route_rules_user_enabled" ON "route_rules" ("user_id", "enabled")`)

    await queryRunner.query(`DROP INDEX "IDX_workspace_models_workspace_enabled"`)
    await queryRunner.query(`ALTER TABLE "workspace_models" DROP CONSTRAINT "UQ_workspace_models_workspace_model"`)
    await queryRunner.query(`ALTER TABLE "workspace_models" ADD CONSTRAINT "UQ_workspace_models_user_model" UNIQUE ("user_id", "model_id")`)
    await queryRunner.query(`CREATE INDEX "IDX_workspace_models_user_enabled" ON "workspace_models" ("user_id", "enabled")`)

    await queryRunner.query(`DROP INDEX "IDX_api_keys_workspace_active"`)
    await queryRunner.query(`DROP INDEX "IDX_api_keys_workspace_name"`)
    await queryRunner.query(`CREATE INDEX "IDX_api_keys_user_active" ON "api_keys" ("user_id", "revoked_at")`)
    await queryRunner.query(`CREATE INDEX "IDX_api_keys_user_name" ON "api_keys" ("user_id", "name")`)

    for (const table of ['usage_buckets', 'request_logs', 'route_rules', 'workspace_models', 'api_keys']) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT "FK_${table}_workspace"`)
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "workspace_id"`)
    }
    await queryRunner.query(`DROP TABLE "projects"`)
    await queryRunner.query(`DROP TABLE "workspace_members"`)
    await queryRunner.query(`DROP TABLE "workspaces"`)
  }
}
