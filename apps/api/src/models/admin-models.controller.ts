import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { AdminModel, AdminModelListResponse, AdminModelSummaryResponse } from '@gateway/contracts'
import { JwtAuthGuard } from '../identity/auth.guard'
import { Roles, RolesGuard } from '../identity/roles.guard'
import { ListAdminModelsQuery, UpdateAdminModelDto } from './dto/admin-models.dto'
import { ModelsService } from './models.service'

@ApiTags('admin-models')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/admin/models')
export class AdminModelsController {
  constructor(private readonly models: ModelsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get platform model configuration totals' })
  summary(): Promise<AdminModelSummaryResponse> { return this.models.adminSummary() }

  @Get()
  @ApiOperation({ summary: 'List all configured platform models, including disabled models' })
  list(@Query() query: ListAdminModelsQuery): Promise<AdminModelListResponse> { return this.models.adminList(query.query, query.page, query.pageSize) }

  @Patch(':id')
  @ApiOperation({ summary: 'Update model availability, featured state, or lifecycle status' })
  update(@Param('id') id: string, @Body() input: UpdateAdminModelDto): Promise<AdminModel> { return this.models.updateAdminModel(id, input) }
}
