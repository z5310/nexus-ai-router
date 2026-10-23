import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { ProviderCredentialEntity, type ProviderEnvironment } from './provider-credential.entity'

export type ProviderChannelHealth = 'unknown' | 'healthy' | 'degraded' | 'unhealthy'

@Entity({ name: 'provider_channels' })
@Index(['provider', 'environment', 'name'], { unique: true })
@Index(['provider', 'environment', 'enabled', 'healthStatus'])
export class ProviderChannelEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 80 })
  name: string

  @Column({ length: 40 })
  provider: string

  @Column({ length: 20 })
  environment: ProviderEnvironment

  @Column({ name: 'credential_id', type: 'uuid' })
  credentialId: string

  @ManyToOne(() => ProviderCredentialEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'credential_id' })
  credential: ProviderCredentialEntity

  @Column({ length: 40, default: 'global' })
  region: string

  @Column({ name: 'timeout_ms', type: 'integer', default: 60_000 })
  timeoutMs: number

  @Column({ name: 'max_concurrency', type: 'integer', default: 100 })
  maxConcurrency: number

  @Column({ default: true })
  enabled: boolean

  @Column({ name: 'health_status', type: 'varchar', length: 20, default: 'unknown' })
  healthStatus: ProviderChannelHealth

  @Column({ name: 'consecutive_failures', type: 'integer', default: 0 })
  consecutiveFailures: number

  @Column({ name: 'last_checked_at', type: 'timestamptz', nullable: true })
  lastCheckedAt: Date | null

  @Column({ name: 'last_success_at', type: 'timestamptz', nullable: true })
  lastSuccessAt: Date | null

  @Column({ name: 'last_failure_at', type: 'timestamptz', nullable: true })
  lastFailureAt: Date | null

  @Column({ name: 'last_error_code', type: 'varchar', length: 80, nullable: true })
  lastErrorCode: string | null

  @Column({ name: 'next_probe_at', type: 'timestamptz', nullable: true })
  nextProbeAt: Date | null

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
