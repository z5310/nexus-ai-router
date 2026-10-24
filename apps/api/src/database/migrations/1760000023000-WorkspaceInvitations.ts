import { MigrationInterface, QueryRunner } from 'typeorm'

export class WorkspaceInvitations1760000023000 implements MigrationInterface {
  name = 'WorkspaceInvitations1760000023000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "workspace_invitations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL,
        "email" varchar(180) NOT NULL,
        "role" varchar(20) NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "invited_by_user_id" uuid NOT NULL,
        "accepted_by_user_id" uuid,
        "expires_at" timestamptz NOT NULL,
        "accepted_at" timestamptz,
        "revoked_at" timestamptz,
        "last_sent_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workspace_invitations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workspace_invitations_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workspace_invitations_inviter" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_workspace_invitations_acceptor" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_workspace_invitations_role" CHECK ("role" IN ('admin','developer','billing','viewer')),
        CONSTRAINT "CHK_workspace_invitations_status" CHECK ("status" IN ('pending','accepted','revoked','expired'))
      )
    `)
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_workspace_invitations_token" ON "workspace_invitations" ("token_hash")')
    await queryRunner.query('CREATE INDEX "IDX_workspace_invitations_workspace_email" ON "workspace_invitations" ("workspace_id", "email")')
    await queryRunner.query('CREATE INDEX "IDX_workspace_invitations_workspace_status_created" ON "workspace_invitations" ("workspace_id", "status", "created_at" DESC)')
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_workspace_invitations_pending_email" ON "workspace_invitations" ("workspace_id", "email") WHERE "status" = \'pending\'')
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_workspace_members_active_owner" ON "workspace_members" ("workspace_id") WHERE "role" = \'owner\' AND "status" = \'active\'')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_workspace_members_active_owner"')
    await queryRunner.query('DROP TABLE "workspace_invitations"')
  }
}
