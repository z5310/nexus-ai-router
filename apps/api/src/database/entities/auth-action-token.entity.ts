import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { UserEntity } from './user.entity'

export type AuthActionPurpose = 'password_reset'

@Entity({ name: 'auth_action_tokens' })
@Index(['tokenHash'], { unique: true })
@Index(['userId', 'purpose', 'expiresAt'])
export class AuthActionTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity

  @Column({ length: 32 })
  purpose: AuthActionPurpose

  @Column({ name: 'token_hash', length: 64 })
  tokenHash: string

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
