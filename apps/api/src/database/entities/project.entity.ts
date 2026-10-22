import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { ProjectStatus } from '@gateway/contracts'
import { WorkspaceEntity } from './workspace.entity'

@Entity({ name: 'projects' })
@Index(['workspaceId', 'slug'], { unique: true })
export class ProjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: WorkspaceEntity

  @Column({ type: 'varchar', length: 120 })
  name: string

  @Column({ type: 'varchar', length: 100 })
  slug: string

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: ProjectStatus

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
