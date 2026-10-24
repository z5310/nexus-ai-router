import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { ModelDeployment, ModelDeploymentListResponse, ProviderDeploymentTestResult } from '@gateway/contracts'
import { JwtAuthGuard } from '../identity/auth.guard'
import { Roles, RolesGuard } from '../identity/roles.guard'
import { CreateModelDeploymentDto, ListModelDeploymentsQuery, UpdateModelDeploymentDto } from './dto/model-deployments.dto'
import { ProviderConfigurationService } from './provider-configuration.service'
import { ProviderConnectivityService } from './provider-connectivity.service'

@ApiTags('admin-model-deployments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/admin/model-deployments')
export class ModelDeploymentsController {
  constructor(
    private readonly configuration: ProviderConfigurationService,
    private readonly connectivity: ProviderConnectivityService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List model deployments and their channel health' })
  list(@Query() query: ListModelDeploymentsQuery): Promise<ModelDeploymentListResponse> { return this.configuration.listDeployments(query) }

  @Post()
  create(@Body() input: CreateModelDeploymentDto): Promise<ModelDeployment> { return this.configuration.createDeployment(input) }

  @Patch(':id')
  update(@Param('id') id: string, @Body() input: UpdateModelDeploymentDto): Promise<ModelDeployment> { return this.configuration.updateDeployment(id, input) }

  @Post(':id/test')
  @ApiOperation({ summary: 'Verify deployment authentication and upstream model visibility without generating content' })
  test(@Param('id') id: string): Promise<ProviderDeploymentTestResult> { return this.connectivity.testDeployment(id) }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@Param('id') id: string): Promise<void> { return this.configuration.removeDeployment(id) }
}
