import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'audit_logs' })
@Index(['createdAt', 'id'])
@Index(['actorUserId', 'createdAt'])
@Index(['resourceType', 'resourceId', 'createdAt'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null

  @Column({ name: 'actor_email', type: 'varchar', length: 255, nullable: true })
  actorEmail: string | null

  @Column({ length: 100 })
  action: string

  @Column({ name: 'resource_type', type: 'varchar', length: 80 })
  resourceType: string

  @Column({ name: 'resource_id', type: 'varchar', length: 160, nullable: true })
  resourceId: string | null

  @Column({ type: 'varchar', length: 20 })
  outcome: 'success' | 'failure'

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string | null

  @Column({ name: 'request_id', type: 'varchar', length: 100, nullable: true })
  requestId: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
