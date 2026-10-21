import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateIdentity1760000002000 implements MigrationInterface {
  name = 'CreateIdentity1760000002000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "email" varchar(180) NOT NULL,
        "password_hash" text NOT NULL,
        "role" varchar(20) NOT NULL DEFAULT 'viewer',
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "last_login_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "CHK_users_role" CHECK ("role" IN ('admin', 'manager', 'viewer')),
        CONSTRAINT "CHK_users_status" CHECK ("status" IN ('active', 'suspended', 'invited'))
      )
    `)
    await queryRunner.query(`CREATE INDEX "IDX_users_status_role" ON "users" ("status", "role")`)
    await queryRunner.query(`
      CREATE TABLE "auth_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_auth_sessions_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_auth_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`CREATE INDEX "IDX_auth_sessions_user_expires" ON "auth_sessions" ("user_id", "expires_at")`)

    await queryRunner.query(`
      INSERT INTO "users" ("name", "email", "password_hash", "role", "status", "last_login_at") VALUES
      ('Nexus 管理员', 'admin@nexus.cn', 'scrypt$b378ee50a7e3e3e9965551bc9dd6ab2b$693be9237bc45dc356df62ea24947ad3c689e1e9924d77cd3f84f2db6421c96433f55a3abb2fa6f75c43efd4760a8bcc186e7db306f8008337d5f5f91cec2d6f', 'admin', 'active', now() - interval '8 minutes'),
      ('演示工作区', 'demo@nexus.cn', 'scrypt$1a54c61a3ee4d765fbc228d3cd8bb195$a04e37516418e9069107372007941ac4088e8ea386528ebac26100d6d942bdb8ee8fb2e1cf2bd9b563ef1fe7921631573c19e60ba323f87286738e12d620ea81', 'manager', 'active', now() - interval '2 hours'),
      ('运营团队', 'ops@nexus.cn', 'scrypt$585e6bda7c980ff5b2188031c4a953f2$502e9af4b5cb2e5e2ce81a254a0086956995e3586c0efceb11d92279bd467edb50f8b2e29f993f6ef641fc650c42adfaaa31554906c47b67d3c4d201a452f236', 'manager', 'active', now() - interval '1 day'),
      ('只读访客', 'viewer@nexus.cn', 'scrypt$aa972ca9cc06f4756461f8a8258014e8$a2f278d37ff8e234a996224e69b11f229a52703f7703755caef652312ba8fd40c6221731917d40ba12f534a4ce318a18760867f033b3ce3886464fdddbea98ca', 'viewer', 'invited', NULL)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "auth_sessions"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_users_status_role"`)
    await queryRunner.query(`DROP TABLE "users"`)
  }
}
