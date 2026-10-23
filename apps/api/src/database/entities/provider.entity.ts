import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { ModelType, ProviderProtocol } from '@gateway/contracts'

@Entity({ name: 'providers' })
@Index(['code'], { unique: true })
@Index(['enabled', 'sortOrder'])
export class ProviderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 40 })
  code: string

  @Column({ length: 80 })
  name: string

  @Column({ length: 30 })
  protocol: ProviderProtocol

  @Column({ name: 'base_url', type: 'varchar', length: 500, nullable: true })
  baseUrl: string | null

  @Column({ name: 'docs_url', type: 'varchar', length: 500, nullable: true })
  docsUrl: string | null

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  capabilities: ModelType[]

  @Column({ default: true })
  enabled: boolean

  @Column({ name: 'sort_order', type: 'integer', default: 100 })
  sortOrder: number

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
