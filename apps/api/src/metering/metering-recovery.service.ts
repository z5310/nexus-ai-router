import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MeteringOutboxService } from './metering-outbox.service'

@Injectable()
export class MeteringRecoveryService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>
  private running = false
  private readonly logger = new Logger(MeteringRecoveryService.name)

  constructor(private readonly outbox: MeteringOutboxService, private readonly config: ConfigService) {}

  onModuleInit(): void {
    void this.tick()
    this.timer = setInterval(() => { void this.tick() }, this.config.get<number>('METERING_OUTBOX_POLL_MS', 5_000))
    this.timer.unref()
  }

  onModuleDestroy(): void { if (this.timer) clearInterval(this.timer) }

  private async tick(): Promise<void> {
    if (this.running) return
    this.running = true
    try { await this.outbox.dispatchPending() }
    catch (error) { this.logger.error(`计量恢复扫描失败: ${error instanceof Error ? error.message : 'unknown error'}`) }
    finally { this.running = false }
  }
}
