import { Injectable } from '@nestjs/common'
import type { RequestPriceSnapshot } from '@gateway/contracts'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { ApiKeyEntity } from '../database/entities/api-key.entity'
import { RequestLogEntity } from '../database/entities/request-log.entity'
import { InferenceAttemptEntity, type InferenceAttemptStatus } from '../database/entities/inference-attempt.entity'
import { WorkspaceModelEntity } from '../database/entities/workspace-model.entity'
import { WorkspaceEntity } from '../database/entities/workspace.entity'
import { WorkspaceMemberEntity } from '../database/entities/workspace-member.entity'
import { MeteringOutboxService } from '../metering/metering-outbox.service'

export interface RecordedInference {
  priceSnapshot?: RequestPriceSnapshot | null
  workspaceId: string
  userId: string
  requestId: string
  requestedModelPublicId: string
  modelPublicId: string
  routeRuleId: string | null
  status: 'success' | 'failed'
  latencyMs: number
  firstTokenLatencyMs: number | null
  errorCode: string | null
  inputTokens: number
  outputTokens: number
  costCny: number
  attempts: RecordedInferenceAttempt[]
}

export interface RecordedInferenceAttempt {
  modelPublicId: string
  provider: string
  channelId: string | null
  deploymentId: string | null
  status: InferenceAttemptStatus
  latencyMs: number
  errorCode: string | null
  errorMessage: string | null
}

@Injectable()
export class InferenceRepository {
  constructor(
    @InjectRepository(ApiKeyEntity) private readonly keys: Repository<ApiKeyEntity>,
    @InjectRepository(WorkspaceModelEntity) private readonly workspaceModels: Repository<WorkspaceModelEntity>,
    private readonly dataSource: DataSource,
    private readonly metering: MeteringOutboxService,
  ) {}

  findActiveKey(keyHash: string): Promise<ApiKeyEntity | null> {
    return this.keys.createQueryBuilder('key')
      .innerJoin(
        WorkspaceMemberEntity,
        'member',
        'member.workspace_id = key.workspace_id AND member.user_id = key.user_id',
      )
      .where('key.key_hash = :keyHash', { keyHash })
      .andWhere('key.revoked_at IS NULL')
      .andWhere('member.status = :memberStatus', { memberStatus: 'active' })
      .andWhere('member.role IN (:...authorizedRoles)', { authorizedRoles: ['owner', 'admin', 'developer'] })
      .getOne()
  }

  workspacePolicy(id: string) {
    return this.dataSource.getRepository(WorkspaceEntity).findOneBy({ id })
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

  async capturePrice(modelId: string): Promise<RequestPriceSnapshot> {
    // One statement sees either side of an atomic price publication, never mixed fields.
    const [row] = await this.dataSource.query(`
      SELECT m.id AS "modelId", m.public_id AS "modelPublicId", m.name AS "modelName",
        m.owner AS "providerName", v.id AS "versionId", m.price_unit AS "priceUnit",
        m.input_price AS "inputPrice", m.output_price AS "outputPrice",
        m.original_input_price AS "originalInputPrice", m.original_output_price AS "originalOutputPrice",
        m.discount_percent AS "discountPercent", m.price_effective_from AS "effectiveFrom"
      FROM models m LEFT JOIN model_price_versions v ON v.model_id = m.id AND v.effective_to IS NULL
      WHERE m.id = $1
    `, [modelId])
    if (!row) throw new Error('模型价格不存在')
    return { ...row, currency: 'CNY', effectiveFrom: new Date(row.effectiveFrom).toISOString() }
  }

  async record(input: RecordedInference): Promise<void> {
    let eventId: string | undefined
    await this.dataSource.transaction(async (manager) => {
      const requestLogRepository = manager.getRepository(RequestLogEntity)
      const requestLog = await requestLogRepository.save(requestLogRepository.create({
        workspaceId: input.workspaceId,
        userId: input.userId,
        requestId: input.requestId,
        requestedModelPublicId: input.requestedModelPublicId,
        modelPublicId: input.modelPublicId,
        routeRuleId: input.routeRuleId,
        attemptCount: input.attempts.length,
        firstTokenLatencyMs: input.firstTokenLatencyMs,
        errorCode: input.errorCode,
        status: input.status,
        latencyMs: input.latencyMs,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        costCny: input.costCny.toFixed(6),
        priceSnapshot: input.priceSnapshot ?? null,
      }))
      if (input.attempts.length > 0) {
        const attemptRepository = manager.getRepository(InferenceAttemptEntity)
        await attemptRepository.save(input.attempts.map((attempt, index) => attemptRepository.create({
          requestLogId: requestLog.id,
          workspaceId: input.workspaceId,
          attemptNumber: index + 1,
          ...attempt,
        })))
      }
      eventId = await this.metering.append(manager, requestLog.id, input)
    })
    if (eventId) this.metering.notify(eventId)
  }
}
