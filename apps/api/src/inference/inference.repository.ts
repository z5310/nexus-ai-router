import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, IsNull, Repository } from 'typeorm'
import { ApiKeyEntity } from '../database/entities/api-key.entity'
import { RequestLogEntity } from '../database/entities/request-log.entity'
import { WorkspaceModelEntity } from '../database/entities/workspace-model.entity'

export interface RecordedInference {
  workspaceId: string
  userId: string
  requestId: string
  modelPublicId: string
  status: 'success' | 'failed'
  latencyMs: number
  inputTokens: number
  outputTokens: number
  costCny: number
}

@Injectable()
export class InferenceRepository {
  constructor(
    @InjectRepository(ApiKeyEntity) private readonly keys: Repository<ApiKeyEntity>,
    @InjectRepository(WorkspaceModelEntity) private readonly workspaceModels: Repository<WorkspaceModelEntity>,
    private readonly dataSource: DataSource,
  ) {}

  findActiveKey(keyHash: string): Promise<ApiKeyEntity | null> {
    return this.keys.findOne({ where: { keyHash, revokedAt: IsNull() } })
  }

  async touchKey(id: string): Promise<void> {
    await this.keys.createQueryBuilder().update(ApiKeyEntity)
      .set({ lastUsedAt: new Date() })
      .where('id = :id', { id })
      .andWhere('(last_used_at IS NULL OR last_used_at < now() - interval \'5 minutes\')')
      .execute()
  }

  findRoutableModel(workspaceId: string, publicId: string): Promise<WorkspaceModelEntity | null> {
    return this.workspaceModels.createQueryBuilder('workspaceModel')
      .innerJoinAndSelect('workspaceModel.model', 'model')
      .where('workspaceModel.workspace_id = :workspaceId', { workspaceId })
      .andWhere('workspaceModel.enabled = true')
      .andWhere('model.is_enabled = true')
      .andWhere('model.public_id = :publicId', { publicId })
      .getOne()
  }

  async record(input: RecordedInference): Promise<void> {
    const bucketStart = new Date()
    bucketStart.setUTCMinutes(0, 0, 0)
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(RequestLogEntity).save(manager.getRepository(RequestLogEntity).create({
        workspaceId: input.workspaceId,
        userId: input.userId,
        requestId: input.requestId,
        modelPublicId: input.modelPublicId,
        status: input.status,
        latencyMs: input.latencyMs,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        costCny: input.costCny.toFixed(6),
      }))
      await manager.query(`
        INSERT INTO "usage_buckets" (
          "workspace_id", "user_id", "bucket_start", "request_count", "token_count",
          "average_latency_ms", "cost_cny", "created_at", "updated_at"
        ) VALUES ($1, $2, $3, 1, $4, $5, $6, now(), now())
        ON CONFLICT ("workspace_id", "bucket_start") DO UPDATE SET
          "request_count" = "usage_buckets"."request_count" + 1,
          "token_count" = "usage_buckets"."token_count" + EXCLUDED."token_count",
          "average_latency_ms" = round(
            (("usage_buckets"."average_latency_ms" * "usage_buckets"."request_count") + EXCLUDED."average_latency_ms")::numeric
            / ("usage_buckets"."request_count" + 1)
          ),
          "cost_cny" = "usage_buckets"."cost_cny" + EXCLUDED."cost_cny",
          "updated_at" = now()
      `, [input.workspaceId, input.userId, bucketStart, input.inputTokens + input.outputTokens, input.latencyMs, input.costCny])
    })
  }
}
