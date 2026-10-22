import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { WorkspaceStatus } from '@gateway/contracts'

@Entity({ name: 'workspaces' })
export class WorkspaceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 120 })
  name: string

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  slug: string

  @Column({ name: 'default_currency', type: 'varchar', length: 3, default: 'CNY' })
  defaultCurrency: string

  @Column({ name: 'ip_allowlist_enabled', type: 'boolean', default: false })
  ipAllowlistEnabled: boolean

  @Column({ name: 'ip_allowlist', type: 'jsonb', default: () => "'[]'::jsonb" })
  ipAllowlist: string[]

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: WorkspaceStatus

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
