import { MigrationInterface, QueryRunner } from 'typeorm'

export class ExpandCatalogAndUsage1760000001000 implements MigrationInterface {
  name = 'ExpandCatalogAndUsage1760000001000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "models"
        ADD COLUMN "provider" varchar(60) NOT NULL DEFAULT 'Nexus',
        ADD COLUMN "description_key" varchar(100) NOT NULL DEFAULT 'modelDesc.gpt',
        ADD COLUMN "input_price" numeric(12,4) NOT NULL DEFAULT 0,
        ADD COLUMN "output_price" numeric(12,4),
        ADD COLUMN "price_unit" varchar(30) NOT NULL DEFAULT 'million_tokens',
        ADD COLUMN "latency_ms" integer NOT NULL DEFAULT 0,
        ADD COLUMN "overall_score" numeric(5,2) NOT NULL DEFAULT 0,
        ADD COLUMN "coding_score" numeric(5,2) NOT NULL DEFAULT 0,
        ADD COLUMN "cost_score" numeric(5,2) NOT NULL DEFAULT 0,
        ADD COLUMN "speed_score" numeric(5,2) NOT NULL DEFAULT 0,
        ADD COLUMN "cost_per_task" numeric(12,4) NOT NULL DEFAULT 0,
        ADD COLUMN "context_label" varchar(30) NOT NULL DEFAULT '128K',
        ADD COLUMN "accent" varchar(20) NOT NULL DEFAULT '#63e495',
        ADD COLUMN "tag_key" varchar(60),
        ADD COLUMN "capabilities" text[] NOT NULL DEFAULT '{}',
        ADD COLUMN "status" varchar(20) NOT NULL DEFAULT 'stable',
        ADD COLUMN "trend" integer,
        ADD COLUMN "is_featured" boolean NOT NULL DEFAULT false
    `)
    await queryRunner.query(`CREATE INDEX "IDX_models_catalog" ON "models" ("is_enabled", "model_type", "provider")`)
    await queryRunner.query(`CREATE INDEX "IDX_models_overall_score" ON "models" ("overall_score" DESC)`)

    await queryRunner.query(`
      INSERT INTO "models" (
        "public_id", "name", "owner", "provider", "model_type", "description_key",
        "input_price", "output_price", "price_unit", "latency_ms", "overall_score",
        "coding_score", "cost_score", "speed_score", "cost_per_task", "context_label",
        "accent", "tag_key", "capabilities", "status", "trend", "is_featured", "is_enabled"
      ) VALUES
        ('openai/gpt-6.1-sol', 'GPT-6.1 Sol', 'openai', 'OpenAI', 'text', 'modelDesc.gpt', 8.40, 42.00, 'million_tokens', 384, 96.8, 98.2, 78.4, 86.1, 5.62, '1M', '#9be9b6', 'tags.new', ARRAY['streaming','tools','vision'], 'stable', 2, true, true),
        ('anthropic/claude-sonnet-5.5', 'Claude Sonnet 5.5', 'anthropic', 'Anthropic', 'text', 'modelDesc.claude', 21.00, 105.00, 'million_tokens', 421, 95.9, 97.1, 72.6, 82.8, 7.18, '500K', '#e8a37b', 'tags.hot', ARRAY['streaming','tools','vision'], 'stable', NULL, false, true),
        ('deepseek/deepseek-v4.1-flash', 'DeepSeek V4.1 Flash', 'deepseek', 'DeepSeek', 'text', 'modelDesc.deepseek', 1.80, 7.20, 'million_tokens', 218, 92.6, 94.4, 94.7, 96.2, 1.34, '128K', '#818cf8', 'tags.lowLatency', ARRAY['streaming','tools'], 'stable', 1, false, true),
        ('alibaba/qwen-3.8-max', 'Qwen 3.8 Max', 'alibaba', '阿里云', 'text', 'modelDesc.qwen', 4.20, 16.80, 'million_tokens', 337, 93.4, 95.2, 89.3, 89.5, 3.91, '256K', '#a78bfa', NULL, ARRAY['streaming','tools','vision'], 'stable', -1, false, true),
        ('google/gemini-3-flash', 'Gemini 3 Flash', 'google', 'Google', 'text', 'modelDesc.gemini', 0.70, 3.50, 'million_tokens', 186, 91.8, 90.1, 98.7, 98.1, 0.86, '1M', '#67e8f9', 'tags.value', ARRAY['streaming','tools','vision'], 'stable', -2, false, true),
        ('bytedance/seedream-5', 'Seedream 5', 'bytedance', '字节跳动', 'image', 'modelDesc.seedream', 0.22, NULL, 'image', 4800, 90.7, 72.4, 91.2, 73.8, 0.22, '图像', '#fbbf24', NULL, ARRAY['vision'], 'stable', 3, false, true),
        ('bytedance/seedance-2.5', 'Seedance 2.5', 'bytedance', '字节跳动', 'video', 'modelDesc.seedance', 0.68, NULL, 'second', 12400, 94.1, 76.3, 84.6, 67.2, 6.80, '视频', '#fb7185', 'tags.creator', ARRAY['vision'], 'stable', 4, false, true),
        ('minimax/speech-3', 'MiniMax Speech 3', 'minimax', 'MiniMax', 'audio', 'modelDesc.speech', 1.20, NULL, '10k_chars', 620, 89.9, 75.1, 92.8, 88.3, 1.20, '音频', '#38bdf8', NULL, ARRAY['streaming'], 'stable', NULL, false, true),
        ('baai/bge-m3', 'BGE M3', 'baai', 'BAAI', 'embedding', 'modelDesc.bge', 0.08, NULL, 'million_tokens', 72, 87.6, 71.3, 99.1, 99.4, 0.08, '8K', '#34d399', NULL, ARRAY['embedding'], 'stable', 1, false, true)
      ON CONFLICT ("public_id") DO UPDATE SET
        "name" = EXCLUDED."name", "owner" = EXCLUDED."owner", "provider" = EXCLUDED."provider",
        "model_type" = EXCLUDED."model_type", "description_key" = EXCLUDED."description_key",
        "input_price" = EXCLUDED."input_price", "output_price" = EXCLUDED."output_price",
        "price_unit" = EXCLUDED."price_unit", "latency_ms" = EXCLUDED."latency_ms",
        "overall_score" = EXCLUDED."overall_score", "coding_score" = EXCLUDED."coding_score",
        "cost_score" = EXCLUDED."cost_score", "speed_score" = EXCLUDED."speed_score",
        "cost_per_task" = EXCLUDED."cost_per_task", "context_label" = EXCLUDED."context_label",
        "accent" = EXCLUDED."accent", "tag_key" = EXCLUDED."tag_key",
        "capabilities" = EXCLUDED."capabilities", "status" = EXCLUDED."status",
        "trend" = EXCLUDED."trend", "is_featured" = EXCLUDED."is_featured", "is_enabled" = true,
        "updated_at" = now()
    `)
    await queryRunner.query(`UPDATE "models" SET "is_enabled" = false WHERE "public_id" IN ('gateway-auto', 'deepseek-chat', 'qwen-plus')`)

    await queryRunner.query(`
      CREATE TABLE "usage_buckets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "bucket_start" timestamptz NOT NULL,
        "request_count" integer NOT NULL DEFAULT 0,
        "token_count" bigint NOT NULL DEFAULT 0,
        "average_latency_ms" integer NOT NULL DEFAULT 0,
        "cost_cny" numeric(14,4) NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_usage_buckets" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_usage_buckets_start" UNIQUE ("bucket_start")
      )
    `)
    await queryRunner.query(`
      INSERT INTO "usage_buckets" ("bucket_start", "request_count", "token_count", "average_latency_ms", "cost_cny")
      SELECT date_trunc('hour', now()) - (value * interval '1 hour'),
             3200 + ((23 - value) * 137),
             620000 + ((23 - value) * 28000),
             330 + ((value % 5) * 18),
             7.4 + ((23 - value) * 0.34)
      FROM generate_series(0, 23) AS series(value)
    `)

    await queryRunner.query(`
      CREATE TABLE "request_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "request_id" varchar(80) NOT NULL,
        "model_public_id" varchar(120) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'success',
        "latency_ms" integer NOT NULL,
        "input_tokens" integer NOT NULL DEFAULT 0,
        "output_tokens" integer NOT NULL DEFAULT 0,
        "cost_cny" numeric(12,6) NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_request_logs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_request_logs_request_id" UNIQUE ("request_id")
      )
    `)
    await queryRunner.query(`CREATE INDEX "IDX_request_logs_created_at" ON "request_logs" ("created_at" DESC)`)
    await queryRunner.query(`
      INSERT INTO "request_logs" ("request_id", "model_public_id", "status", "latency_ms", "input_tokens", "output_tokens", "cost_cny", "created_at") VALUES
        ('req_9ab2f3', 'openai/gpt-6.1-sol', 'success', 384, 1320, 522, 0.0284, now() - interval '2 minutes'),
        ('req_8fc12a', 'deepseek/deepseek-v4.1-flash', 'success', 218, 680, 240, 0.0038, now() - interval '7 minutes'),
        ('req_7de994', 'anthropic/claude-sonnet-5.5', 'success', 426, 2480, 624, 0.0842, now() - interval '13 minutes'),
        ('req_6ca821', 'alibaba/qwen-3.8-max', 'success', 337, 930, 350, 0.0126, now() - interval '21 minutes')
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "request_logs"`)
    await queryRunner.query(`DROP TABLE "usage_buckets"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_models_overall_score"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_models_catalog"`)
    await queryRunner.query(`
      ALTER TABLE "models"
        DROP COLUMN "is_featured", DROP COLUMN "trend", DROP COLUMN "status",
        DROP COLUMN "capabilities", DROP COLUMN "tag_key", DROP COLUMN "accent",
        DROP COLUMN "context_label", DROP COLUMN "cost_per_task", DROP COLUMN "speed_score",
        DROP COLUMN "cost_score", DROP COLUMN "coding_score", DROP COLUMN "overall_score",
        DROP COLUMN "latency_ms", DROP COLUMN "price_unit", DROP COLUMN "output_price",
        DROP COLUMN "input_price", DROP COLUMN "description_key", DROP COLUMN "provider"
    `)
  }
}
