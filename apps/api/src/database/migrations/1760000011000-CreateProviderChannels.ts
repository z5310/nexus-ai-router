import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateProviderChannels1760000011000 implements MigrationInterface {
  name = 'CreateProviderChannels1760000011000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "provider_channels" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(80) NOT NULL,
        "provider" varchar(40) NOT NULL,
        "environment" varchar(20) NOT NULL,
        "credential_id" uuid NOT NULL,
        "region" varchar(40) NOT NULL DEFAULT 'global',
        "timeout_ms" integer NOT NULL DEFAULT 60000,
        "max_concurrency" integer NOT NULL DEFAULT 100,
        "enabled" boolean NOT NULL DEFAULT true,
        "health_status" varchar(20) NOT NULL DEFAULT 'unknown',
        "consecutive_failures" integer NOT NULL DEFAULT 0,
        "last_checked_at" timestamptz,
        "last_success_at" timestamptz,
        "last_failure_at" timestamptz,
        "last_error_code" varchar(80),
        "next_probe_at" timestamptz,
        "created_by_user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_provider_channels" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_provider_channels_identity" UNIQUE ("provider", "environment", "name"),
        CONSTRAINT "CHK_provider_channels_environment" CHECK ("environment" IN ('development','staging','production')),
        CONSTRAINT "CHK_provider_channels_health" CHECK ("health_status" IN ('unknown','healthy','degraded','unhealthy')),
        CONSTRAINT "CHK_provider_channels_timeout" CHECK ("timeout_ms" BETWEEN 1000 AND 300000),
        CONSTRAINT "CHK_provider_channels_concurrency" CHECK ("max_concurrency" BETWEEN 1 AND 100000),
        CONSTRAINT "FK_provider_channels_credential" FOREIGN KEY ("credential_id") REFERENCES "provider_credentials"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_provider_channels_creator" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `)
    await queryRunner.query('CREATE INDEX "IDX_provider_channels_routing" ON "provider_channels" ("provider", "environment", "enabled", "health_status")')
    await queryRunner.query(`
      CREATE TABLE "model_deployments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "model_id" uuid NOT NULL,
        "channel_id" uuid NOT NULL,
        "upstream_model_id" varchar(160) NOT NULL,
        "priority" integer NOT NULL DEFAULT 100,
        "weight" integer NOT NULL DEFAULT 100,
        "enabled" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_model_deployments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_model_deployments_target" UNIQUE ("model_id", "channel_id", "upstream_model_id"),
        CONSTRAINT "CHK_model_deployments_priority" CHECK ("priority" BETWEEN 1 AND 10000),
        CONSTRAINT "CHK_model_deployments_weight" CHECK ("weight" BETWEEN 1 AND 10000),
        CONSTRAINT "FK_model_deployments_model" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_model_deployments_channel" FOREIGN KEY ("channel_id") REFERENCES "provider_channels"("id") ON DELETE RESTRICT
      )
    `)
    await queryRunner.query('CREATE INDEX "IDX_model_deployments_routing" ON "model_deployments" ("model_id", "enabled", "priority")')
    await queryRunner.query(`
      ALTER TABLE "inference_attempts"
        ADD COLUMN "channel_id" uuid,
        ADD COLUMN "deployment_id" uuid
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "inference_attempts" DROP COLUMN "deployment_id", DROP COLUMN "channel_id"')
    await queryRunner.query('DROP TABLE "model_deployments"')
    await queryRunner.query('DROP TABLE "provider_channels"')
  }
}
