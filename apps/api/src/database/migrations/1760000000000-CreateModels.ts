import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateModels1760000000000 implements MigrationInterface {
  name = 'CreateModels1760000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "models" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "public_id" varchar(120) NOT NULL,
        "name" varchar(120) NOT NULL,
        "owner" varchar(40) NOT NULL,
        "model_type" varchar(20) NOT NULL DEFAULT 'text',
        "is_enabled" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_models" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_models_public_id" UNIQUE ("public_id")
      )
    `)
    await queryRunner.query(`
      INSERT INTO "models" ("public_id", "name", "owner") VALUES
      ('gateway-auto', '智能路由', 'gateway'),
      ('deepseek-chat', 'DeepSeek Chat', 'deepseek'),
      ('qwen-plus', 'Qwen Plus', 'qwen')
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "models"')
  }
}
