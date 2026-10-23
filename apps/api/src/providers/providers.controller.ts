import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { ProviderDefinition, ProviderDefinitionListResponse } from '@gateway/contracts'
import { JwtAuthGuard, type AuthenticatedRequest } from '../identity/auth.guard'
import { Roles, RolesGuard } from '../identity/roles.guard'
import { CreateProviderDto, ListProvidersQuery, UpdateProviderDto } from './dto/providers.dto'
import { ProvidersService } from './providers.service'

@ApiTags('admin-providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/admin/providers')
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get()
  @ApiOperation({ summary: 'List platform provider definitions' })
  list(@Query() query: ListProvidersQuery): Promise<ProviderDefinitionListResponse> { return this.providers.list(query) }

  @Post()
  @ApiOperation({ summary: 'Register a provider definition' })
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateProviderDto): Promise<ProviderDefinition> { return this.providers.create(request.user.sub, input) }

  @Patch(':id')
  update(@Param('id') id: string, @Body() input: UpdateProviderDto): Promise<ProviderDefinition> { return this.providers.update(id, input) }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@Param('id') id: string): Promise<void> { return this.providers.remove(id) }
}
