import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { WorkspaceInvitationStatus, WorkspaceRole } from '@gateway/contracts'

@Entity({ name: 'workspace_invitations' })
@Index(['workspaceId', 'email'])
@Index(['tokenHash'], { unique: true })
@Index(['workspaceId', 'status', 'createdAt'])
export class WorkspaceInvitationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string

  @Column({ type: 'varchar', length: 180 })
  email: string

  @Column({ type: 'varchar', length: 20 })
  role: Exclude<WorkspaceRole, 'owner'>

  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash: string

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: WorkspaceInvitationStatus

  @Column({ name: 'invited_by_user_id', type: 'uuid' })
  invitedByUserId: string

  @Column({ name: 'accepted_by_user_id', type: 'uuid', nullable: true })
  acceptedByUserId: string | null

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date | null

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null

  @Column({ name: 'last_sent_at', type: 'timestamptz' })
  lastSentAt: Date

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
