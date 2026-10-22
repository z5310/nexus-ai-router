import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateProviderCredentials1760000007000 implements MigrationInterface {
  name = 'CreateProviderCredentials1760000007000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "provider_credentials" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "provider" varchar(40) NOT NULL,
        "environment" varchar(20) NOT NULL,
        "name" varchar(80) NOT NULL,
        "encrypted_secret" text NOT NULL,
        "iv" varchar(24) NOT NULL,
        "auth_tag" varchar(24) NOT NULL,
        "key_version" varchar(40) NOT NULL,
        "secret_last_four" varchar(4) NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "created_by_user_id" uuid NOT NULL,
        "rotated_at" timestamptz NOT NULL DEFAULT now(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_provider_credentials" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_provider_credentials_provider_environment_name" UNIQUE ("provider", "environment", "name"),
        CONSTRAINT "FK_provider_credentials_creator" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_provider_credentials_environment" CHECK ("environment" IN ('development','staging','production')),
        CONSTRAINT "CHK_provider_credentials_provider" CHECK ("provider" ~ '^[a-z0-9][a-z0-9-]{1,39}$')
      )
    `)
    await queryRunner.query(`CREATE INDEX "IDX_provider_credentials_lookup" ON "provider_credentials" ("provider", "environment", "enabled")`)
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_provider_credentials_active" ON "provider_credentials" ("provider", "environment") WHERE "enabled" = true`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "provider_credentials"`)
  }
}
