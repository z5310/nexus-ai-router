import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddModelTags1760000015000 implements MigrationInterface {
  name = 'AddModelTags1760000015000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "models" ADD COLUMN "tags" text[] NOT NULL DEFAULT '{}'`)
    await queryRunner.query(`UPDATE "models" SET "tags" = CASE WHEN "tag_key" IS NULL THEN '{}'::text[] ELSE ARRAY["tag_key"] END`)
    await queryRunner.query(`ALTER TABLE "models" DROP COLUMN "tag_key"`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "models" ADD COLUMN "tag_key" varchar(60)`)
    await queryRunner.query(`UPDATE "models" SET "tag_key" = "tags"[1]`)
    await queryRunner.query(`ALTER TABLE "models" DROP COLUMN "tags"`)
  }
}
