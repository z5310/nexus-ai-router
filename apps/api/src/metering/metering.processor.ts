import { Processor, WorkerHost } from '@nestjs/bullmq'
import type { Job } from 'bullmq'
import { MeteringOutboxService } from './metering-outbox.service'
import { METERING_QUEUE, type MeteringJob } from './metering.queue'

@Processor(METERING_QUEUE, { concurrency: 10 })
export class MeteringProcessor extends WorkerHost {
  constructor(private readonly outbox: MeteringOutboxService) { super() }

  async process(job: Job<MeteringJob>): Promise<void> {
    await this.outbox.consume(job.data.eventId)
  }
}
