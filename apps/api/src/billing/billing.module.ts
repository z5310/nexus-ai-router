import { Module } from '@nestjs/common'
import { IdentityModule } from '../identity/identity.module'
import { BillingService } from './billing.service'
import { BillingController } from './billing.controller'
import { ChatBillingService } from './chat-billing.service'
import { BillingReconciliationService } from './billing-reconciliation.service'
import { AdminBillingService } from './admin-billing.service'
import { AdminBillingController } from './admin-billing.controller'

@Module({ imports: [IdentityModule], providers: [BillingService, ChatBillingService, BillingReconciliationService, AdminBillingService], controllers: [BillingController, AdminBillingController], exports: [BillingService, ChatBillingService] })
export class BillingModule {}
