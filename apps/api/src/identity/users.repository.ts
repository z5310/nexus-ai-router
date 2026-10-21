import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserEntity } from '../database/entities/user.entity'
import type { ListUsersQuery } from './dto/users.dto'

@Injectable()
export class UsersRepository {
  constructor(@InjectRepository(UserEntity) private readonly repository: Repository<UserEntity>) {}

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { email: email.trim().toLowerCase() } })
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { id } })
  }

  async list(query: ListUsersQuery): Promise<[UserEntity[], number]> {
    const builder = this.repository.createQueryBuilder('user')
    if (query.query?.trim()) {
      builder.where('(user.name ILIKE :query OR user.email ILIKE :query)', { query: `%${query.query.trim()}%` })
    }
    if (query.role) builder.andWhere('user.role = :role', { role: query.role })
    if (query.status) builder.andWhere('user.status = :status', { status: query.status })
    return builder.orderBy('user.createdAt', 'DESC').skip((query.page - 1) * query.pageSize).take(query.pageSize).getManyAndCount()
  }

  save(user: UserEntity): Promise<UserEntity> {
    return this.repository.save(user)
  }

  create(input: Partial<UserEntity>): UserEntity {
    return this.repository.create(input)
  }

  async summary(): Promise<Array<{ status: string; role: string; count: number }>> {
    return this.repository.createQueryBuilder('user')
      .select('user.status', 'status')
      .addSelect('user.role', 'role')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('user.status')
      .addGroupBy('user.role')
      .getRawMany<{ status: string; role: string; count: number }>()
  }
}
