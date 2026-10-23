import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateRankingSources1760000014000 implements MigrationInterface {
  name = 'CreateRankingSources1760000014000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ranking_sources" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" varchar(60) NOT NULL, "name" varchar(100) NOT NULL,
        "adapter" varchar(30) NOT NULL, "dataset_id" varchar(200) NOT NULL, "metric" varchar(20) NOT NULL,
        "score_multiplier" numeric(10,4) NOT NULL DEFAULT 1, "priority" integer NOT NULL DEFAULT 100,
        "enabled" boolean NOT NULL DEFAULT false, "attribution_label" varchar(120) NOT NULL,
        "source_url" varchar(500) NOT NULL, "last_synced_at" timestamptz, "last_success_at" timestamptz,
        "last_error" varchar(500), "created_by_user_id" uuid, "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ranking_sources" PRIMARY KEY ("id"), CONSTRAINT "UQ_ranking_sources_code" UNIQUE ("code"),
        CONSTRAINT "CHK_ranking_sources_code" CHECK ("code" ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
        CONSTRAINT "CHK_ranking_sources_adapter" CHECK ("adapter" IN ('huggingface')),
        CONSTRAINT "CHK_ranking_sources_metric" CHECK ("metric" IN ('overall','coding','cost','speed')),
        CONSTRAINT "CHK_ranking_sources_multiplier" CHECK ("score_multiplier" > 0 AND "score_multiplier" <= 1000),
        CONSTRAINT "CHK_ranking_sources_priority" CHECK ("priority" BETWEEN 0 AND 10000),
        CONSTRAINT "FK_ranking_sources_creator" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `)
    await queryRunner.query('CREATE INDEX "IDX_ranking_sources_active" ON "ranking_sources" ("enabled", "metric", "priority")')
    await queryRunner.query(`
      CREATE TABLE "model_benchmark_mappings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "source_id" uuid NOT NULL, "model_id" uuid NOT NULL,
        "external_model_id" varchar(240) NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "PK_model_benchmark_mappings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_model_benchmark_mapping_model" UNIQUE ("source_id", "model_id"),
        CONSTRAINT "UQ_model_benchmark_mapping_external" UNIQUE ("source_id", "external_model_id"),
        CONSTRAINT "FK_model_benchmark_mapping_source" FOREIGN KEY ("source_id") REFERENCES "ranking_sources"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_model_benchmark_mapping_model" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`
      CREATE TABLE "benchmark_snapshots" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "source_id" uuid NOT NULL, "external_model_id" varchar(240) NOT NULL,
        "rank" integer NOT NULL, "raw_score" numeric(12,4) NOT NULL, "normalized_score" numeric(5,2) NOT NULL,
        "verified" boolean NOT NULL DEFAULT false, "author" varchar(160), "captured_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "PK_benchmark_snapshots" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_benchmark_snapshots_entry" UNIQUE ("source_id", "external_model_id", "captured_at"),
        CONSTRAINT "CHK_benchmark_snapshots_rank" CHECK ("rank" > 0),
        CONSTRAINT "CHK_benchmark_snapshots_score" CHECK ("normalized_score" BETWEEN 0 AND 100),
        CONSTRAINT "FK_benchmark_snapshots_source" FOREIGN KEY ("source_id") REFERENCES "ranking_sources"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query('CREATE INDEX "IDX_benchmark_snapshots_source_time" ON "benchmark_snapshots" ("source_id", "captured_at" DESC)')
    await queryRunner.query(`
      INSERT INTO "ranking_sources" ("code", "name", "adapter", "dataset_id", "metric", "score_multiplier", "priority", "enabled", "attribution_label", "source_url")
      VALUES ('swe-bench-verified', 'SWE-bench Verified', 'huggingface', 'SWE-bench/SWE-bench_Verified', 'coding', 1, 10, false, 'Hugging Face · SWE-bench Verified', 'https://huggingface.co/datasets/SWE-bench/SWE-bench_Verified')
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "benchmark_snapshots"')
    await queryRunner.query('DROP TABLE "model_benchmark_mappings"')
    await queryRunner.query('DROP TABLE "ranking_sources"')
  }
}
