import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { WorkspaceModelEntity } from '../database/entities/workspace-model.entity'

@Injectable()
export class WorkspaceModelsRepository {
  constructor(@InjectRepository(WorkspaceModelEntity) private readonly repository: Repository<WorkspaceModelEntity>) {}

  list(workspaceId: string): Promise<WorkspaceModelEntity[]> {
    return this.repository.find({ where: { workspaceId }, relations: { model: true }, order: { priority: 'DESC', createdAt: 'ASC' } })
  }

  find(id: string, workspaceId: string): Promise<WorkspaceModelEntity | null> {
    return this.repository.findOne({ where: { id, workspaceId }, relations: { model: true } })
  }

  findByModel(workspaceId: string, modelId: string): Promise<WorkspaceModelEntity | null> {
    return this.repository.findOne({ where: { workspaceId, modelId } })
  }

  create(input: Partial<WorkspaceModelEntity>): WorkspaceModelEntity { return this.repository.create(input) }
  save(config: WorkspaceModelEntity): Promise<WorkspaceModelEntity> { return this.repository.save(config) }
  async remove(config: WorkspaceModelEntity): Promise<void> { await this.repository.remove(config) }
}
