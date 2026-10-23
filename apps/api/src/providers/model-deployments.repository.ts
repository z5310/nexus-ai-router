import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ModelDeploymentEntity } from '../database/entities/model-deployment.entity'

@Injectable()
export class ModelDeploymentsRepository {
  constructor(@InjectRepository(ModelDeploymentEntity) private readonly repository: Repository<ModelDeploymentEntity>) {}

  list(filters: { modelId?: string; channelId?: string }): Promise<ModelDeploymentEntity[]> {
    return this.repository.find({ where: filters, relations: { model: true, channel: { credential: true } }, order: { priority: 'ASC', createdAt: 'ASC' } })
  }

  find(id: string): Promise<ModelDeploymentEntity | null> {
    return this.repository.findOne({ where: { id }, relations: { model: true, channel: { credential: true } } })
  }

  listRoutable(modelId: string, environment: string): Promise<ModelDeploymentEntity[]> {
    return this.repository.createQueryBuilder('deployment')
      .innerJoinAndSelect('deployment.channel', 'channel')
      .innerJoinAndSelect('channel.credential', 'credential')
      .where('deployment.modelId = :modelId', { modelId })
      .andWhere('deployment.enabled = true')
      .andWhere('channel.enabled = true')
      .andWhere('channel.environment = :environment', { environment })
      .andWhere('credential.enabled = true')
      .andWhere(`(channel.healthStatus != 'unhealthy' OR channel.nextProbeAt IS NULL OR channel.nextProbeAt <= CURRENT_TIMESTAMP)`)
      .orderBy(`CASE channel.healthStatus WHEN 'healthy' THEN 0 WHEN 'unknown' THEN 1 WHEN 'degraded' THEN 2 ELSE 3 END`, 'ASC')
      .addOrderBy('deployment.priority', 'ASC')
      .addOrderBy('deployment.createdAt', 'ASC')
      .getMany()
  }

  create(input: Partial<ModelDeploymentEntity>): ModelDeploymentEntity { return this.repository.create(input) }
  save(deployment: ModelDeploymentEntity): Promise<ModelDeploymentEntity> { return this.repository.save(deployment) }
  async remove(deployment: ModelDeploymentEntity): Promise<void> { await this.repository.remove(deployment) }
}
