import { Module } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuditLogEntity } from '../database/entities/audit-log.entity'
import { IdentityModule } from '../identity/identity.module'
import { AdminMutationAuditInterceptor } from './admin-mutation-audit.interceptor'
import { AdminSecurityController } from './admin-security.controller'
import { AdminSecurityService } from './admin-security.service'
import { AuditRepository } from './audit.repository'
import { AuditService } from './audit.service'

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity]), IdentityModule],
  controllers: [AdminSecurityController],
  providers: [AuditRepository, AuditService, AdminSecurityService, { provide: APP_INTERCEPTOR, useClass: AdminMutationAuditInterceptor }],
  exports: [AuditService],
})
export class AuditModule {}
