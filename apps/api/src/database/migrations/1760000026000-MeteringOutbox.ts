import { MigrationInterface, QueryRunner } from 'typeorm'

export class MeteringOutbox1760000026000 implements MigrationInterface {
  name = 'MeteringOutbox1760000026000'

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE "metering_outbox_events" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "event_type" varchar(40) NOT NULL,
      "aggregate_id" uuid NOT NULL,
      "workspace_id" uuid NOT NULL,
      "payload" jsonb NOT NULL,
      "attempt_count" integer NOT NULL DEFAULT 0,
      "available_at" timestamptz NOT NULL DEFAULT now(),
      "processed_at" timestamptz,
      "dead_lettered_at" timestamptz,
      "last_error" varchar(300),
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_metering_outbox_events" PRIMARY KEY ("id"),
      CONSTRAINT "FK_metering_outbox_request" FOREIGN KEY ("aggregate_id") REFERENCES "request_logs"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_metering_outbox_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
      CONSTRAINT "CHK_metering_outbox_type" CHECK ("event_type" = 'inference.recorded'),
      CONSTRAINT "CHK_metering_outbox_attempts" CHECK ("attempt_count" >= 0),
      CONSTRAINT "CHK_metering_outbox_terminal" CHECK (NOT ("processed_at" IS NOT NULL AND "dead_lettered_at" IS NOT NULL))
    )`)
    await runner.query('CREATE UNIQUE INDEX "IDX_metering_outbox_aggregate" ON "metering_outbox_events" ("event_type", "aggregate_id")')
    await runner.query(`CREATE INDEX "IDX_metering_outbox_pending" ON "metering_outbox_events" ("available_at", "created_at")
      WHERE "processed_at" IS NULL AND "dead_lettered_at" IS NULL`)
    await runner.query('CREATE INDEX "IDX_metering_outbox_workspace_created" ON "metering_outbox_events" ("workspace_id", "created_at" DESC)')
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE "metering_outbox_events"')
  }
}
