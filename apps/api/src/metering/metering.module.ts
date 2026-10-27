import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { TypeOrmModule } from '@nestjs/typeorm'
import { IdentityModule } from '../identity/identity.module'
import { MeteringOutboxEventEntity } from '../database/entities/metering-outbox-event.entity'
import { AdminMeteringController } from './admin-metering.controller'
import { MeteringOutboxService } from './metering-outbox.service'
import { MeteringProcessor } from './metering.processor'
import { METERING_QUEUE } from './metering.queue'
import { MeteringRecoveryService } from './metering-recovery.service'

@Module({
  imports: [IdentityModule, TypeOrmModule.forFeature([MeteringOutboxEventEntity]), BullModule.registerQueue({ name: METERING_QUEUE })],
  controllers: [AdminMeteringController],
  providers: [MeteringOutboxService, MeteringProcessor, MeteringRecoveryService],
  exports: [MeteringOutboxService],
})
export class MeteringModule {}
