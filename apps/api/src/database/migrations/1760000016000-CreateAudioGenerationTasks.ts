import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAudioGenerationTasks1760000016000 implements MigrationInterface {
  name = 'CreateAudioGenerationTasks1760000016000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audio_generation_tasks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "model_id" uuid NOT NULL,
        "model_public_id" varchar(120) NOT NULL,
        "model_name" varchar(120) NOT NULL,
        "status" varchar(20) NOT NULL,
        "prompt" text NOT NULL,
        "voice" varchar(80) NOT NULL,
        "instruction" varchar(100),
        "language" varchar(40),
        "speech_rate" numeric(4,2) NOT NULL,
        "pitch" smallint NOT NULL,
        "volume" numeric(4,2) NOT NULL,
        "sample_rate" integer NOT NULL,
        "bitrate" integer NOT NULL,
        "response_format" varchar(10) NOT NULL,
        "provider" varchar(60) NOT NULL,
        "upstream_model_id" varchar(160) NOT NULL,
        "channel_id" uuid,
        "deployment_id" uuid,
        "result_url" text,
        "result_expires_at" timestamptz,
        "duration_ms" integer,
        "estimated_cost_cny" numeric(12,6) NOT NULL,
        "settled_cost_cny" numeric(12,6),
        "error_code" varchar(80),
        "error_message" varchar(300),
        "started_at" timestamptz,
        "completed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audio_generation_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_audio_generation_tasks_status" CHECK ("status" IN ('queued','processing','succeeded','failed','cancelled')),
        CONSTRAINT "CHK_audio_generation_tasks_format" CHECK ("response_format" IN ('mp3','wav','flac')),
        CONSTRAINT "CHK_audio_generation_tasks_prompt" CHECK (char_length("prompt") BETWEEN 1 AND 10000),
        CONSTRAINT "FK_audio_generation_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_audio_generation_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_audio_generation_model" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_audio_generation_channel" FOREIGN KEY ("channel_id") REFERENCES "provider_channels"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_audio_generation_deployment" FOREIGN KEY ("deployment_id") REFERENCES "model_deployments"("id") ON DELETE SET NULL
      )
    `)
    await queryRunner.query('CREATE INDEX "IDX_audio_generation_actor_created" ON "audio_generation_tasks" ("workspace_id", "user_id", "created_at" DESC)')
    await queryRunner.query('CREATE INDEX "IDX_audio_generation_status_created" ON "audio_generation_tasks" ("workspace_id", "status", "created_at" DESC)')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "audio_generation_tasks"')
  }
}
