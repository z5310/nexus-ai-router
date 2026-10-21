import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthSessionEntity } from '../database/entities/auth-session.entity'
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

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, AuthSessionEntity]),
    JwtModule.registerAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => ({ secret: config.getOrThrow<string>('JWT_SECRET') }) }),
  ],
  controllers: [AuthController, AdminUsersController],
  providers: [AuthService, UsersService, UsersRepository, SessionsRepository, PasswordService, JwtAuthGuard, RolesGuard],
  exports: [JwtAuthGuard, RolesGuard, UsersService],
})
export class IdentityModule {}
