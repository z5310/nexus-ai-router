import { BadRequestException, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../identity/auth.guard'
import { Roles, RolesGuard } from '../identity/roles.guard'
import { MeteringOutboxService } from './metering-outbox.service'

@ApiTags('admin-metering')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/admin/metering-events')
export class AdminMeteringController {
  constructor(private readonly outbox: MeteringOutboxService) {}

  @Get()
  list(@Query('status') status = 'dead', @Query('limit') rawLimit = '50') {
    if (!['pending', 'dead', 'processed'].includes(status)) throw new BadRequestException('计量事件状态无效')
    const limit = Number(rawLimit)
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw new BadRequestException('limit 必须为 1 到 200 的整数')
    return this.outbox.list(status as 'pending' | 'dead' | 'processed', limit)
  }

  @Post(':id/replay')
  replay(@Param('id', ParseUUIDPipe) id: string) {
    return this.outbox.replay(id)
  }
}
