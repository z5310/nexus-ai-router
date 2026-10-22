import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'api_keys' })
@Index(['userId', 'name'])
export class ApiKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ length: 80 })
  name: string

  @Column({ name: 'key_hash', length: 64, unique: true })
  keyHash: string

  @Column({ name: 'key_prefix', length: 16 })
  keyPrefix: string

  @Column({ name: 'last_four', length: 4 })
  lastFour: string

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
