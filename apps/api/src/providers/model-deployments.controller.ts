import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { ModelDeployment, ModelDeploymentListResponse } from '@gateway/contracts'
import { JwtAuthGuard } from '../identity/auth.guard'
import { Roles, RolesGuard } from '../identity/roles.guard'
import { CreateModelDeploymentDto, ListModelDeploymentsQuery, UpdateModelDeploymentDto } from './dto/model-deployments.dto'
import { ProviderConfigurationService } from './provider-configuration.service'

@ApiTags('admin-model-deployments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/admin/model-deployments')
export class ModelDeploymentsController {
  constructor(private readonly configuration: ProviderConfigurationService) {}

  @Get()
  @ApiOperation({ summary: 'List model deployments and their channel health' })
  list(@Query() query: ListModelDeploymentsQuery): Promise<ModelDeploymentListResponse> { return this.configuration.listDeployments(query) }

  @Post()
  create(@Body() input: CreateModelDeploymentDto): Promise<ModelDeployment> { return this.configuration.createDeployment(input) }

  @Patch(':id')
  update(@Param('id') id: string, @Body() input: UpdateModelDeploymentDto): Promise<ModelDeployment> { return this.configuration.updateDeployment(id, input) }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@Param('id') id: string): Promise<void> { return this.configuration.removeDeployment(id) }
}
