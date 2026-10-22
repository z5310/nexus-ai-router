import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { ProviderCredential, ProviderCredentialListResponse } from '@gateway/contracts'
import { JwtAuthGuard, type AuthenticatedRequest } from '../identity/auth.guard'
import { Roles, RolesGuard } from '../identity/roles.guard'
import { CreateProviderCredentialDto, ListProviderCredentialsQuery, UpdateProviderCredentialDto } from './dto/provider-credentials.dto'
import { ProviderCredentialsService } from './provider-credentials.service'

@ApiTags('admin-provider-credentials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/admin/provider-credentials')
export class ProviderCredentialsController {
  constructor(private readonly credentials: ProviderCredentialsService) {}

  @Get()
  @ApiOperation({ summary: 'List encrypted provider credential metadata' })
  list(@Query() query: ListProviderCredentialsQuery): Promise<ProviderCredentialListResponse> {
    return this.credentials.list(query)
  }

  @Post()
  @ApiOperation({ summary: 'Encrypt and store a provider credential' })
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateProviderCredentialDto): Promise<ProviderCredential> {
    return this.credentials.create(request.user.sub, input)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename, rotate, enable, or disable a provider credential' })
  update(@Param('id') id: string, @Body() input: UpdateProviderCredentialDto): Promise<ProviderCredential> {
    return this.credentials.update(id, input)
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@Param('id') id: string): Promise<void> { return this.credentials.remove(id) }
}
