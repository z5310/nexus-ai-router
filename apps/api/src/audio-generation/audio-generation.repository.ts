import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AudioGenerationTaskEntity } from '../database/entities/audio-generation-task.entity'

@Injectable()
export class AudioGenerationRepository {
  constructor(@InjectRepository(AudioGenerationTaskEntity) private readonly repository: Repository<AudioGenerationTaskEntity>) {}

  create(input: Partial<AudioGenerationTaskEntity>): AudioGenerationTaskEntity { return this.repository.create(input) }
  save(task: AudioGenerationTaskEntity): Promise<AudioGenerationTaskEntity> { return this.repository.save(task) }
  findById(id: string): Promise<AudioGenerationTaskEntity | null> { return this.repository.findOne({ where: { id } }) }

  findVisible(id: string, workspaceId: string, userId: string): Promise<AudioGenerationTaskEntity | null> {
    return this.repository.findOne({ where: { id, workspaceId, userId } })
  }

  list(workspaceId: string, userId: string, model: string | undefined, limit: number): Promise<AudioGenerationTaskEntity[]> {
    return this.repository.find({
      where: { workspaceId, userId, ...(model ? { modelPublicId: model } : {}) },
      order: { createdAt: 'DESC' },
      take: limit,
    })
  }

  async markProcessing(id: string): Promise<boolean> {
    const result = await this.repository.createQueryBuilder().update(AudioGenerationTaskEntity)
      .set({ status: 'processing', startedAt: new Date(), errorCode: null, errorMessage: null })
      .where('id = :id AND status = :status', { id, status: 'queued' }).execute()
    return (result.affected ?? 0) > 0
  }

  async markSucceeded(id: string, result: { url: string; durationMs: number | null; expiresAt: Date | null }): Promise<void> {
    await this.repository.createQueryBuilder().update(AudioGenerationTaskEntity).set({
      status: 'succeeded', resultUrl: result.url, durationMs: result.durationMs,
      resultExpiresAt: result.expiresAt, completedAt: new Date(), errorCode: null, errorMessage: null,
    }).where('id = :id AND status = :status', { id, status: 'processing' }).execute()
  }

  async markFailed(id: string, code: string, message: string): Promise<void> {
    await this.repository.createQueryBuilder().update(AudioGenerationTaskEntity).set({
      status: 'failed', errorCode: code.slice(0, 80), errorMessage: message.slice(0, 300), completedAt: new Date(),
    }).where('id = :id AND status IN (:...statuses)', { id, statuses: ['queued', 'processing'] }).execute()
  }

  async cancel(id: string, workspaceId: string, userId: string): Promise<boolean> {
    const result = await this.repository.createQueryBuilder().update(AudioGenerationTaskEntity).set({
      status: 'cancelled', completedAt: new Date(), errorCode: null, errorMessage: null,
    }).where('id = :id AND workspace_id = :workspaceId AND user_id = :userId AND status = :status', {
      id, workspaceId, userId, status: 'queued',
    }).execute()
    return (result.affected ?? 0) > 0
  }
}
