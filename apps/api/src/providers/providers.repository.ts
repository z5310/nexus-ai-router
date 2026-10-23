import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProviderEntity } from '../database/entities/provider.entity'

@Injectable()
export class ProvidersRepository {
  constructor(@InjectRepository(ProviderEntity) private readonly repository: Repository<ProviderEntity>) {}

  list(filters: { enabled?: boolean }): Promise<ProviderEntity[]> {
    return this.repository.find({ where: filters, order: { sortOrder: 'ASC', name: 'ASC' } })
  }

  find(id: string): Promise<ProviderEntity | null> { return this.repository.findOne({ where: { id } }) }
  findByCode(code: string): Promise<ProviderEntity | null> { return this.repository.findOne({ where: { code } }) }
  create(input: Partial<ProviderEntity>): ProviderEntity { return this.repository.create(input) }
  save(entity: ProviderEntity): Promise<ProviderEntity> { return this.repository.save(entity) }
  async remove(entity: ProviderEntity): Promise<void> { await this.repository.remove(entity) }
}
