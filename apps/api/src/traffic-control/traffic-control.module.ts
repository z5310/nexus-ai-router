import { Global, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { GlobalRateLimitGuard } from './global-rate-limit.guard'
import { TrafficControlService } from './traffic-control.service'

@Global()
@Module({
  providers: [
    TrafficControlService,
    GlobalRateLimitGuard,
    { provide: APP_GUARD, useExisting: GlobalRateLimitGuard },
  ],
  exports: [TrafficControlService],
})
export class TrafficControlModule {}
