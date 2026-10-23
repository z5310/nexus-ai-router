import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { RankingSource, RankingSourceDetailResponse, RankingSourceListResponse } from '@gateway/contracts'
import { JwtAuthGuard, type AuthenticatedRequest } from '../identity/auth.guard'
import { Roles, RolesGuard } from '../identity/roles.guard'
import { CreateRankingSourceDto, UpdateRankingSourceDto, UpsertBenchmarkMappingDto } from './dto/ranking-sources.dto'
import { RankingSourcesService } from './ranking-sources.service'

@ApiTags('admin-ranking-sources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/admin/ranking-sources')
export class RankingSourcesController {
  constructor(private readonly sources: RankingSourcesService) {}
  @Get() list(): Promise<RankingSourceListResponse> { return this.sources.list() }
  @Get(':id') detail(@Param('id') id: string): Promise<RankingSourceDetailResponse> { return this.sources.detail(id) }
  @Post() create(@Req() request: AuthenticatedRequest, @Body() input: CreateRankingSourceDto): Promise<RankingSource> { return this.sources.create(request.user.sub, input) }
  @Patch(':id') update(@Param('id') id: string, @Body() input: UpdateRankingSourceDto): Promise<RankingSource> { return this.sources.update(id, input) }
  @Post(':id/sync') @ApiOperation({ summary: 'Fetch and persist a trusted leaderboard snapshot' }) sync(@Param('id') id: string): Promise<RankingSourceDetailResponse> { return this.sources.sync(id) }
  @Post(':id/mappings') map(@Param('id') id: string, @Body() input: UpsertBenchmarkMappingDto): Promise<RankingSourceDetailResponse> { return this.sources.mapModel(id, input) }
  @Delete('mappings/:mappingId') @HttpCode(204) @ApiNoContentResponse() unmap(@Param('mappingId') id: string): Promise<void> { return this.sources.unmapModel(id) }
  @Delete(':id') @HttpCode(204) @ApiNoContentResponse() remove(@Param('id') id: string): Promise<void> { return this.sources.remove(id) }
}
