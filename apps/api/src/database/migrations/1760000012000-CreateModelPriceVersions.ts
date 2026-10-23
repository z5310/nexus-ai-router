import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateModelPriceVersions1760000012000 implements MigrationInterface {
  name = 'CreateModelPriceVersions1760000012000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "models"
        ADD COLUMN "original_input_price" numeric(12,4) NOT NULL DEFAULT 0,
        ADD COLUMN "original_output_price" numeric(12,4),
        ADD COLUMN "discount_percent" numeric(5,2) NOT NULL DEFAULT 0,
        ADD COLUMN "price_effective_from" timestamptz NOT NULL DEFAULT now()
    `)
    await queryRunner.query(`
      UPDATE "models"
      SET "original_input_price" = "input_price",
          "original_output_price" = "output_price",
          "price_effective_from" = "created_at"
    `)
    await queryRunner.query(`
      ALTER TABLE "models"
        ADD CONSTRAINT "CHK_models_discount_percent" CHECK ("discount_percent" BETWEEN 0 AND 100),
        ADD CONSTRAINT "CHK_models_original_input_price" CHECK ("original_input_price" >= "input_price"),
        ADD CONSTRAINT "CHK_models_original_output_price" CHECK (
          ("output_price" IS NULL AND "original_output_price" IS NULL)
          OR ("output_price" IS NOT NULL AND "original_output_price" >= "output_price")
        )
    `)
    await queryRunner.query(`
      CREATE TABLE "model_price_versions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "model_id" uuid NOT NULL,
        "input_price" numeric(12,4) NOT NULL,
        "output_price" numeric(12,4),
        "original_input_price" numeric(12,4) NOT NULL,
        "original_output_price" numeric(12,4),
        "discount_percent" numeric(5,2) NOT NULL,
        "price_unit" varchar(30) NOT NULL,
        "effective_from" timestamptz NOT NULL,
        "effective_to" timestamptz,
        "created_by_user_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_model_price_versions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_model_price_versions_model" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_model_price_versions_creator" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_model_price_versions_discount" CHECK ("discount_percent" BETWEEN 0 AND 100),
        CONSTRAINT "CHK_model_price_versions_input" CHECK ("input_price" >= 0 AND "original_input_price" >= "input_price"),
        CONSTRAINT "CHK_model_price_versions_output" CHECK (
          ("output_price" IS NULL AND "original_output_price" IS NULL)
          OR ("output_price" IS NOT NULL AND "output_price" >= 0 AND "original_output_price" >= "output_price")
        ),
        CONSTRAINT "CHK_model_price_versions_window" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
      )
    `)
    await queryRunner.query('CREATE INDEX "IDX_model_price_versions_history" ON "model_price_versions" ("model_id", "effective_from" DESC)')
    await queryRunner.query('CREATE UNIQUE INDEX "UQ_model_price_versions_active" ON "model_price_versions" ("model_id") WHERE "effective_to" IS NULL')
    await queryRunner.query(`
      INSERT INTO "model_price_versions" (
        "model_id", "input_price", "output_price", "original_input_price", "original_output_price",
        "discount_percent", "price_unit", "effective_from"
      )
      SELECT "id", "input_price", "output_price", "input_price", "output_price", 0, "price_unit", "created_at"
      FROM "models"
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "model_price_versions"')
    await queryRunner.query(`
      ALTER TABLE "models"
        DROP CONSTRAINT "CHK_models_original_output_price",
        DROP CONSTRAINT "CHK_models_original_input_price",
        DROP CONSTRAINT "CHK_models_discount_percent",
        DROP COLUMN "price_effective_from",
        DROP COLUMN "discount_percent",
        DROP COLUMN "original_output_price",
        DROP COLUMN "original_input_price"
    `)
  }
}
