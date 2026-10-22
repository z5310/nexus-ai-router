import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { AuthUser, UserListResponse, UserSummaryResponse } from '@gateway/contracts'
import { PasswordService } from './password.service'
import { UsersRepository } from './users.repository'
import type { CreateUserDto, ListUsersQuery, UpdateUserDto } from './dto/users.dto'
import type { UserEntity } from '../database/entities/user.entity'
import { SessionsRepository } from './sessions.repository'

@Injectable()
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionsRepository,
  ) {}

  async list(query: ListUsersQuery): Promise<UserListResponse> {
    const [users, total] = await this.users.list(query)
    return { data: users.map((user) => this.toAuthUser(user)), pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } }
  }

  async detail(id: string): Promise<AuthUser> {
    return this.toAuthUser(await this.require(id))
  }

  async create(input: CreateUserDto): Promise<AuthUser> {
    const email = input.email.trim().toLowerCase()
    if (await this.users.findByEmail(email)) throw new ConflictException('该邮箱已被使用')
    const user = this.users.create({ ...input, email, name: input.name.trim(), passwordHash: await this.passwords.hash(input.password), passwordChangedAt: new Date() })
    return this.toAuthUser(await this.users.save(user))
  }

  async update(id: string, input: UpdateUserDto, actorId: string): Promise<AuthUser> {
    const user = await this.require(id)
    if (id === actorId && input.status === 'suspended') throw new BadRequestException('不能停用当前登录账户')
    if (input.email) {
      const email = input.email.trim().toLowerCase()
      const existing = await this.users.findByEmail(email)
      if (existing && existing.id !== id) throw new ConflictException('该邮箱已被使用')
      user.email = email
    }
    if (input.name) user.name = input.name.trim()
    if (input.role) user.role = input.role
    if (input.status) user.status = input.status
    if (input.password) {
      user.passwordHash = await this.passwords.hash(input.password)
      user.passwordChangedAt = new Date()
    }
    const saved = await this.users.save(user)
    if (input.password || input.status === 'suspended') await this.sessions.revokeAll(user.id)
    return this.toAuthUser(saved)
  }

  async summary(): Promise<UserSummaryResponse> {
    const rows = await this.users.summary()
    return rows.reduce<UserSummaryResponse>((result, row) => {
      result.total += Number(row.count)
      if (row.status === 'active') result.active += Number(row.count)
      if (row.status === 'suspended') result.suspended += Number(row.count)
      if (row.status === 'invited') result.invited += Number(row.count)
      if (row.role === 'admin') result.admins += Number(row.count)
      return result
    }, { total: 0, active: 0, suspended: 0, invited: 0, admins: 0 })
  }

  async require(id: string): Promise<UserEntity> {
    const user = await this.users.findById(id)
    if (!user) throw new NotFoundException('用户不存在')
    return user
  }

  toAuthUser(user: UserEntity): AuthUser {
    return { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, lastLoginAt: user.lastLoginAt?.toISOString() ?? null, createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString() }
  }
}
