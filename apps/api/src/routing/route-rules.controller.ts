import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { RouteRule, RouteRuleListResponse } from '@gateway/contracts'
import { JwtAuthGuard, type AuthenticatedRequest } from '../identity/auth.guard'
import { CreateRouteRuleDto, UpdateRouteRuleDto } from './dto/route-rules.dto'
import { RouteRulesService } from './route-rules.service'

@ApiTags('route-rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/console/routes')
export class RouteRulesController {
  constructor(private readonly rules: RouteRulesService) {}

  @Get()
  @ApiOperation({ summary: 'List route rules for the current account workspace' })
  list(@Req() request: AuthenticatedRequest): Promise<RouteRuleListResponse> { return this.rules.list(request.user.sub) }

  @Post()
  @ApiOperation({ summary: 'Create a model route rule' })
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateRouteRuleDto): Promise<RouteRule> { return this.rules.create(request.user.sub, input) }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a model route rule' })
  update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: UpdateRouteRuleDto): Promise<RouteRule> { return this.rules.update(request.user.sub, id, input) }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiOperation({ summary: 'Delete a model route rule' })
  remove(@Req() request: AuthenticatedRequest, @Param('id') id: string): Promise<void> { return this.rules.remove(request.user.sub, id) }
}
