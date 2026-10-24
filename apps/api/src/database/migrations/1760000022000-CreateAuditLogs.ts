import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAuditLogs1760000022000 implements MigrationInterface {
  name = 'CreateAuditLogs1760000022000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "actor_user_id" uuid,
        "actor_email" varchar(255),
        "action" varchar(100) NOT NULL,
        "resource_type" varchar(80) NOT NULL,
        "resource_id" varchar(160),
        "outcome" varchar(20) NOT NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "ip_address" varchar(64),
        "user_agent" varchar(500),
        "request_id" varchar(100),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_audit_logs_outcome" CHECK ("outcome" IN ('success','failure'))
      )
    `)
    await queryRunner.query('CREATE INDEX "IDX_audit_logs_created" ON "audit_logs" ("created_at" DESC, "id" DESC)')
    await queryRunner.query('CREATE INDEX "IDX_audit_logs_actor_created" ON "audit_logs" ("actor_user_id", "created_at" DESC)')
    await queryRunner.query('CREATE INDEX "IDX_audit_logs_resource_created" ON "audit_logs" ("resource_type", "resource_id", "created_at" DESC)')
    await queryRunner.query(`
      CREATE FUNCTION audit_logs_reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'audit logs are append-only'; END;
      $$;
      CREATE TRIGGER audit_logs_immutable BEFORE UPDATE OR DELETE ON audit_logs
        FOR EACH ROW EXECUTE FUNCTION audit_logs_reject_mutation();
      CREATE TRIGGER audit_logs_no_truncate BEFORE TRUNCATE ON audit_logs
        FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_reject_mutation();
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "audit_logs"')
    await queryRunner.query('DROP FUNCTION IF EXISTS audit_logs_reject_mutation')
  }
}
