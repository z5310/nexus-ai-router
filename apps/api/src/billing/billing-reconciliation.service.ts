import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { ChatBillingService } from './chat-billing.service'

@Injectable()
export class BillingReconciliationService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>
  private running = false
  private readonly logger = new Logger(BillingReconciliationService.name)
  constructor(private readonly billing: ChatBillingService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => { void this.tick() }, 30_000)
    this.timer.unref()
  }

  onModuleDestroy(): void { if (this.timer) clearInterval(this.timer) }

  private async tick(): Promise<void> {
    if (this.running) return
    this.running = true
    try { await this.billing.reconcile() }
    catch (error) { this.logger.error('计费恢复任务失败', error instanceof Error ? error.stack : undefined) }
    finally { this.running = false }
  }
}
