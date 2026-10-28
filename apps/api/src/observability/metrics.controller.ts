import { Controller, Get, Header } from '@nestjs/common'
import { ApiExcludeEndpoint } from '@nestjs/swagger'
import { MetricsCollectorService } from './metrics-collector.service'

@Controller()
export class MetricsController {
  constructor(private readonly collector: MetricsCollectorService) {}

  @Get('metrics')
  @Header('content-type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiExcludeEndpoint()
  metrics(): Promise<string> {
    return this.collector.collect()
  }
}
