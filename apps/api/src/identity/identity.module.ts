import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthSessionEntity } from '../database/entities/auth-session.entity'
import { AuthActionTokenEntity } from '../database/entities/auth-action-token.entity'
import { UserEntity } from '../database/entities/user.entity'
import { AdminUsersController } from './admin-users.controller'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './auth.guard'
import { PasswordService } from './password.service'
import { RolesGuard } from './roles.guard'
import { SessionsRepository } from './sessions.repository'
import { UsersRepository } from './users.repository'
import { UsersService } from './users.service'
import { ActionTokensRepository } from './action-tokens.repository'
import { WorkspacesModule } from '../workspaces/workspaces.module'
import { WorkspacesController } from '../workspaces/workspaces.controller'
import { WorkspaceInvitationsController } from '../workspaces/workspace-invitations.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, AuthSessionEntity, AuthActionTokenEntity]),
    WorkspacesModule,
    JwtModule.registerAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => ({ secret: config.getOrThrow<string>('JWT_SECRET') }) }),
  ],
  controllers: [AuthController, AdminUsersController, WorkspacesController, WorkspaceInvitationsController],
  providers: [AuthService, UsersService, UsersRepository, SessionsRepository, ActionTokensRepository, PasswordService, JwtAuthGuard, RolesGuard],
  exports: [JwtModule, JwtAuthGuard, RolesGuard, UsersService, SessionsRepository, WorkspacesModule],
})
export class IdentityModule {}
