import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { ProviderChannel, ProviderChannelListResponse } from '@gateway/contracts'
import { JwtAuthGuard, type AuthenticatedRequest } from '../identity/auth.guard'
import { Roles, RolesGuard } from '../identity/roles.guard'
import { CreateProviderChannelDto, ListProviderChannelsQuery, UpdateProviderChannelDto } from './dto/provider-channels.dto'
import { ProviderConfigurationService } from './provider-configuration.service'

@ApiTags('admin-provider-channels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/admin/provider-channels')
export class ProviderChannelsController {
  constructor(private readonly configuration: ProviderConfigurationService) {}

  @Get()
  @ApiOperation({ summary: 'List provider channels and health state' })
  list(@Query() query: ListProviderChannelsQuery): Promise<ProviderChannelListResponse> { return this.configuration.listChannels(query) }

  @Post()
  @ApiOperation({ summary: 'Create a provider channel backed by encrypted credential metadata' })
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateProviderChannelDto): Promise<ProviderChannel> { return this.configuration.createChannel(request.user.sub, input) }

  @Patch(':id')
  update(@Param('id') id: string, @Body() input: UpdateProviderChannelDto): Promise<ProviderChannel> { return this.configuration.updateChannel(id, input) }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@Param('id') id: string): Promise<void> { return this.configuration.removeChannel(id) }
}
