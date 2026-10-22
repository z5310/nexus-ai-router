import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { WorkspaceMemberStatus, WorkspaceRole } from '@gateway/contracts'
import { WorkspaceEntity } from './workspace.entity'

@Entity({ name: 'workspace_members' })
@Index(['workspaceId', 'userId'], { unique: true })
@Index(['userId', 'status'])
export class WorkspaceMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: WorkspaceEntity

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ type: 'varchar', length: 20, default: 'developer' })
  role: WorkspaceRole

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: WorkspaceMemberStatus

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
