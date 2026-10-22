import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export type ProviderEnvironment = 'development' | 'staging' | 'production'

@Entity({ name: 'provider_credentials' })
@Index(['provider', 'environment', 'name'], { unique: true })
@Index(['provider', 'environment', 'enabled'])
export class ProviderCredentialEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 40 })
  provider: string

  @Column({ length: 20 })
  environment: ProviderEnvironment

  @Column({ length: 80 })
  name: string

  @Column({ name: 'encrypted_secret', type: 'text' })
  encryptedSecret: string

  @Column({ length: 24 })
  iv: string

  @Column({ name: 'auth_tag', length: 24 })
  authTag: string

  @Column({ name: 'key_version', length: 40 })
  keyVersion: string

  @Column({ name: 'secret_last_four', length: 4 })
  secretLastFour: string

  @Column({ default: true })
  enabled: boolean

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId: string

  @Column({ name: 'rotated_at', type: 'timestamptz' })
  rotatedAt: Date

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
