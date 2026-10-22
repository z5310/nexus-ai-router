import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { UserRole, UserStatus } from '@gateway/contracts'
import { AuthSessionEntity } from './auth-session.entity'

@Entity({ name: 'users' })
@Index(['email'], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 100 })
  name: string

  @Column({ length: 180 })
  email: string

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash: string

  @Column({ length: 20, default: 'viewer' })
  role: UserRole

  @Column({ length: 20, default: 'active' })
  status: UserStatus

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null

  @Column({ name: 'failed_login_count', type: 'integer', default: 0 })
  failedLoginCount: number

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date | null

  @Column({ name: 'password_changed_at', type: 'timestamptz', nullable: true })
  passwordChangedAt: Date | null

  @OneToMany(() => AuthSessionEntity, (session) => session.user)
  sessions: AuthSessionEntity[]

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
