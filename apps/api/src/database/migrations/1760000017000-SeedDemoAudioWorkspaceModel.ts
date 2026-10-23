import { MigrationInterface, QueryRunner } from 'typeorm'

export class SeedDemoAudioWorkspaceModel1760000017000 implements MigrationInterface {
  name = 'SeedDemoAudioWorkspaceModel1760000017000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "workspace_models" (
        "user_id", "workspace_id", "model_id", "alias", "priority", "rate_limit_rpm", "daily_budget_cny", "enabled"
      )
      SELECT member."user_id", member."workspace_id", model."id", '语音合成演示', 50, 30, 20, true
      FROM "workspace_members" member
      INNER JOIN "users" user_record ON user_record."id" = member."user_id"
      INNER JOIN "models" model ON model."public_id" = 'minimax/speech-3'
      WHERE user_record."email" = 'demo@nexus.cn' AND member."status" = 'active'
      ON CONFLICT ("workspace_id", "model_id") DO NOTHING
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "workspace_models" workspace_model
      USING "workspace_members" member, "users" user_record, "models" model
      WHERE workspace_model."workspace_id" = member."workspace_id"
        AND workspace_model."user_id" = member."user_id"
        AND member."user_id" = user_record."id"
        AND workspace_model."model_id" = model."id"
        AND user_record."email" = 'demo@nexus.cn'
        AND model."public_id" = 'minimax/speech-3'
        AND workspace_model."alias" = '语音合成演示'
    `)
  }
}
