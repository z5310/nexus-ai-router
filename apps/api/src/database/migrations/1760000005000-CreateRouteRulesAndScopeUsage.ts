import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateRouteRulesAndScopeUsage1760000005000 implements MigrationInterface {
  name = 'CreateRouteRulesAndScopeUsage1760000005000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "request_logs" ADD COLUMN "user_id" uuid`)
    await queryRunner.query(`ALTER TABLE "usage_buckets" ADD COLUMN "user_id" uuid`)
    await queryRunner.query(`UPDATE "request_logs" SET "user_id" = (SELECT "id" FROM "users" WHERE "email" = 'demo@nexus.cn' LIMIT 1) WHERE "user_id" IS NULL`)
    await queryRunner.query(`UPDATE "usage_buckets" SET "user_id" = (SELECT "id" FROM "users" WHERE "email" = 'demo@nexus.cn' LIMIT 1) WHERE "user_id" IS NULL`)
    await queryRunner.query(`ALTER TABLE "request_logs" ALTER COLUMN "user_id" SET NOT NULL`)
    await queryRunner.query(`ALTER TABLE "usage_buckets" ALTER COLUMN "user_id" SET NOT NULL`)
    await queryRunner.query(`ALTER TABLE "request_logs" ADD CONSTRAINT "FK_request_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`)
    await queryRunner.query(`ALTER TABLE "usage_buckets" ADD CONSTRAINT "FK_usage_buckets_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`)
    await queryRunner.query(`CREATE INDEX "IDX_request_logs_user_created" ON "request_logs" ("user_id", "created_at")`)
    await queryRunner.query(`ALTER TABLE "usage_buckets" DROP CONSTRAINT "UQ_usage_buckets_start"`)
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_usage_buckets_user_bucket" ON "usage_buckets" ("user_id", "bucket_start")`)
    await queryRunner.query(`
      CREATE TABLE "route_rules" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "name" varchar(80) NOT NULL,
        "match_type" varchar(20) NOT NULL DEFAULT 'all',
        "strategy" varchar(24) NOT NULL DEFAULT 'priority',
        "primary_model_id" uuid NOT NULL,
        "fallback_model_id" uuid,
        "traffic_percent" integer NOT NULL DEFAULT 100,
        "enabled" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_route_rules" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_route_rules_user_name" UNIQUE ("user_id", "name"),
        CONSTRAINT "FK_route_rules_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_route_rules_primary_model" FOREIGN KEY ("primary_model_id") REFERENCES "workspace_models"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_route_rules_fallback_model" FOREIGN KEY ("fallback_model_id") REFERENCES "workspace_models"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_route_rules_match_type" CHECK ("match_type" IN ('all','text','image','video','audio','embedding')),
        CONSTRAINT "CHK_route_rules_strategy" CHECK ("strategy" IN ('priority','lowest_cost','lowest_latency')),
        CONSTRAINT "CHK_route_rules_traffic" CHECK ("traffic_percent" BETWEEN 1 AND 100),
        CONSTRAINT "CHK_route_rules_distinct_models" CHECK ("fallback_model_id" IS NULL OR "fallback_model_id" <> "primary_model_id")
      )
    `)
    await queryRunner.query(`CREATE INDEX "IDX_route_rules_user_enabled" ON "route_rules" ("user_id", "enabled")`)
    await queryRunner.query(`
      WITH ranked AS (
        SELECT wm."user_id", wm."id", row_number() OVER (PARTITION BY wm."user_id" ORDER BY wm."priority" DESC, wm."created_at" ASC) AS rn
        FROM "workspace_models" wm
        INNER JOIN "users" u ON u."id" = wm."user_id"
        WHERE u."email" = 'demo@nexus.cn' AND wm."enabled" = true
      ), chosen AS (
        SELECT "user_id", (max("id"::text) FILTER (WHERE rn = 1))::uuid AS primary_id, (max("id"::text) FILTER (WHERE rn = 2))::uuid AS fallback_id
        FROM ranked GROUP BY "user_id"
      )
      INSERT INTO "route_rules" ("user_id", "name", "match_type", "strategy", "primary_model_id", "fallback_model_id", "traffic_percent", "enabled")
      SELECT "user_id", '智能自动路由', 'all', 'priority', primary_id, fallback_id, 100, true
      FROM chosen WHERE primary_id IS NOT NULL
      ON CONFLICT ("user_id", "name") DO NOTHING
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "route_rules"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_usage_buckets_user_bucket"`)
    await queryRunner.query(`ALTER TABLE "usage_buckets" ADD CONSTRAINT "UQ_usage_buckets_start" UNIQUE ("bucket_start")`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_request_logs_user_created"`)
    await queryRunner.query(`ALTER TABLE "usage_buckets" DROP CONSTRAINT "FK_usage_buckets_user"`)
    await queryRunner.query(`ALTER TABLE "request_logs" DROP CONSTRAINT "FK_request_logs_user"`)
    await queryRunner.query(`ALTER TABLE "usage_buckets" DROP COLUMN "user_id"`)
    await queryRunner.query(`ALTER TABLE "request_logs" DROP COLUMN "user_id"`)
  }
}
