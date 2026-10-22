import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { WorkspaceModelEntity } from '../database/entities/workspace-model.entity'

@Injectable()
export class WorkspaceModelsRepository {
  constructor(@InjectRepository(WorkspaceModelEntity) private readonly repository: Repository<WorkspaceModelEntity>) {}

  list(userId: string): Promise<WorkspaceModelEntity[]> {
    return this.repository.find({ where: { userId }, relations: { model: true }, order: { priority: 'DESC', createdAt: 'ASC' } })
  }

  find(id: string, userId: string): Promise<WorkspaceModelEntity | null> {
    return this.repository.findOne({ where: { id, userId }, relations: { model: true } })
  }

  findByModel(userId: string, modelId: string): Promise<WorkspaceModelEntity | null> {
    return this.repository.findOne({ where: { userId, modelId } })
  }

  create(input: Partial<WorkspaceModelEntity>): WorkspaceModelEntity { return this.repository.create(input) }
  save(config: WorkspaceModelEntity): Promise<WorkspaceModelEntity> { return this.repository.save(config) }
  async remove(config: WorkspaceModelEntity): Promise<void> { await this.repository.remove(config) }
}
