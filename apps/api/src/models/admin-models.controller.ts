import { Body, Controller, Get, Param, Patch, Put, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { AdminModel, AdminModelListResponse, AdminModelSummaryResponse, ModelPricingResponse } from '@gateway/contracts'
import { JwtAuthGuard, type AuthenticatedRequest } from '../identity/auth.guard'
import { Roles, RolesGuard } from '../identity/roles.guard'
import { ListAdminModelsQuery, UpdateAdminModelDto, UpdateAdminModelPricingDto } from './dto/admin-models.dto'
import { ModelPricingService } from './model-pricing.service'
import { ModelsService } from './models.service'

@ApiTags('admin-models')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/admin/models')
export class AdminModelsController {
  constructor(private readonly models: ModelsService, private readonly pricing: ModelPricingService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get platform model configuration totals' })
  summary(): Promise<AdminModelSummaryResponse> { return this.models.adminSummary() }

  @Get()
  @ApiOperation({ summary: 'List all configured platform models, including disabled models' })
  list(@Query() query: ListAdminModelsQuery): Promise<AdminModelListResponse> { return this.models.adminList(query.query, query.page, query.pageSize) }

  @Patch(':id')
  @ApiOperation({ summary: 'Update model availability, featured state, or lifecycle status' })
  update(@Param('id') id: string, @Body() input: UpdateAdminModelDto): Promise<AdminModel> { return this.models.updateAdminModel(id, input) }

  @Get(':id/pricing')
  @ApiOperation({ summary: 'Get current model price and immutable publication history' })
  pricingDetail(@Param('id') id: string): Promise<ModelPricingResponse> { return this.pricing.detail(id) }

  @Put(':id/pricing')
  @ApiOperation({ summary: 'Publish a new model price version immediately' })
  publishPricing(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: UpdateAdminModelPricingDto): Promise<ModelPricingResponse> {
    return this.pricing.publish(id, request.user.sub, input)
  }
}
