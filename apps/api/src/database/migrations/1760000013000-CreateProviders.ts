import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateProviders1760000013000 implements MigrationInterface {
  name = 'CreateProviders1760000013000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "providers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" varchar(40) NOT NULL,
        "name" varchar(80) NOT NULL,
        "protocol" varchar(30) NOT NULL,
        "base_url" varchar(500),
        "docs_url" varchar(500),
        "capabilities" text[] NOT NULL DEFAULT '{}',
        "enabled" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 100,
        "created_by_user_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_providers" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_providers_code" UNIQUE ("code"),
        CONSTRAINT "CHK_providers_code" CHECK ("code" ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
        CONSTRAINT "CHK_providers_protocol" CHECK ("protocol" IN ('openai_compatible','anthropic','google','custom')),
        CONSTRAINT "CHK_providers_sort_order" CHECK ("sort_order" BETWEEN 0 AND 10000),
        CONSTRAINT "FK_providers_creator" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `)
    await queryRunner.query('CREATE INDEX "IDX_providers_enabled_sort" ON "providers" ("enabled", "sort_order")')
    await queryRunner.query(`
      INSERT INTO "providers" ("code", "name", "protocol", "base_url", "docs_url", "capabilities", "sort_order") VALUES
        ('openai', 'OpenAI', 'openai_compatible', 'https://api.openai.com/v1', 'https://platform.openai.com/docs', ARRAY['text','image','audio','embedding'], 10),
        ('anthropic', 'Anthropic', 'anthropic', 'https://api.anthropic.com', 'https://docs.anthropic.com', ARRAY['text'], 20),
        ('google', 'Google Gemini', 'google', 'https://generativelanguage.googleapis.com', 'https://ai.google.dev/gemini-api/docs', ARRAY['text','image','audio','video','embedding'], 30),
        ('deepseek', 'DeepSeek', 'openai_compatible', 'https://api.deepseek.com', 'https://api-docs.deepseek.com', ARRAY['text'], 40),
        ('alibaba', '阿里云百炼', 'openai_compatible', 'https://dashscope.aliyuncs.com/compatible-mode/v1', 'https://help.aliyun.com/zh/model-studio', ARRAY['text','image','audio','video','embedding'], 50),
        ('bytedance', '火山引擎', 'openai_compatible', 'https://ark.cn-beijing.volces.com/api/v3', 'https://www.volcengine.com/docs/82379', ARRAY['text','image','video','embedding'], 60),
        ('minimax', 'MiniMax', 'openai_compatible', 'https://api.minimax.chat/v1', 'https://platform.minimaxi.com/document', ARRAY['text','image','audio','video'], 70),
        ('baai', '智源研究院', 'custom', NULL, 'https://www.baai.ac.cn', ARRAY['text','embedding'], 80),
        ('gateway', 'Nexus Gateway', 'openai_compatible', NULL, NULL, ARRAY['text','image','audio','video','embedding'], 90),
        ('qwen', '通义千问', 'openai_compatible', 'https://dashscope.aliyuncs.com/compatible-mode/v1', 'https://help.aliyun.com/zh/model-studio', ARRAY['text','image','audio','video','embedding'], 55)
      ON CONFLICT ("code") DO NOTHING
    `)
    await queryRunner.query(`
      INSERT INTO "providers" ("code", "name", "protocol", "capabilities", "sort_order")
      SELECT code, initcap(replace(code, '-', ' ')), 'openai_compatible', ARRAY['text'], 500
      FROM (
        SELECT DISTINCT lower("provider") AS code FROM "provider_credentials"
        UNION
        SELECT DISTINCT lower("provider") AS code FROM "provider_channels"
      ) existing
      WHERE code ~ '^[a-z0-9][a-z0-9-]{1,39}$'
      ON CONFLICT ("code") DO NOTHING
    `)
    await queryRunner.query('UPDATE "provider_credentials" SET "provider" = lower("provider")')
    await queryRunner.query('UPDATE "provider_channels" SET "provider" = lower("provider")')
    await queryRunner.query('ALTER TABLE "provider_credentials" ADD CONSTRAINT "FK_provider_credentials_provider" FOREIGN KEY ("provider") REFERENCES "providers"("code") ON UPDATE CASCADE ON DELETE RESTRICT')
    await queryRunner.query('ALTER TABLE "provider_channels" ADD CONSTRAINT "FK_provider_channels_provider" FOREIGN KEY ("provider") REFERENCES "providers"("code") ON UPDATE CASCADE ON DELETE RESTRICT')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "provider_channels" DROP CONSTRAINT "FK_provider_channels_provider"')
    await queryRunner.query('ALTER TABLE "provider_credentials" DROP CONSTRAINT "FK_provider_credentials_provider"')
    await queryRunner.query('DROP TABLE "providers"')
  }
}
