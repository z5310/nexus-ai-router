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

  listRoutable(workspaceId: string): Promise<WorkspaceModelEntity[]> {
    return this.repository.createQueryBuilder('workspaceModel')
      .innerJoinAndSelect('workspaceModel.model', 'model')
      .where('workspaceModel.workspace_id = :workspaceId', { workspaceId })
      .andWhere('workspaceModel.enabled = true')
      .andWhere('model.is_enabled = true')
      .orderBy('workspaceModel.priority', 'DESC')
      .addOrderBy('workspaceModel.created_at', 'ASC')
      .getMany()
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
