import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import type { HealthResponse } from '@gateway/contracts'

@ApiTags('system')
@Controller('api')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get('health')
  @ApiOperation({ summary: 'Liveness check' })
  health(): HealthResponse {
    return {
      status: 'ok',
      service: 'model-gateway-api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    }
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check including PostgreSQL' })
  async ready(): Promise<HealthResponse> {
    await this.dataSource.query('SELECT 1')
    return this.health()
  }
}
