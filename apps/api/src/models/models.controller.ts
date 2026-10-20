import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import type { CatalogModel, ModelListResponse, OpenAIModelList, RankingListResponse } from '@gateway/contracts'
import { ListModelsQuery, ListRankingsQuery } from './dto/list-models.query'
import { ModelsService } from './models.service'

@ApiTags('openai-compatible')
@Controller('v1/models')
export class ModelsController {
  constructor(private readonly models: ModelsService) {}

  @Get()
  @ApiOperation({ summary: 'List enabled models in OpenAI format' })
  async list(): Promise<OpenAIModelList> {
    return this.models.listOpenAI()
  }
}

@ApiTags('catalog')
@Controller('api/models')
export class CatalogModelsController {
  constructor(private readonly models: ModelsService) {}

  @Get()
  @ApiOperation({ summary: 'Search and filter the public model catalog' })
  list(@Query() query: ListModelsQuery): Promise<ModelListResponse> {
    return this.models.list(query)
  }

  @Get(':publicId')
  @ApiOperation({ summary: 'Get a model by its public id' })
  @ApiParam({ name: 'publicId', example: 'openai/gpt-6.1-sol' })
  detail(@Param('publicId') publicId: string): Promise<CatalogModel> {
    return this.models.detail(publicId)
  }
}

@ApiTags('rankings')
@Controller('api/rankings')
export class RankingsController {
  constructor(private readonly models: ModelsService) {}

  @Get()
  @ApiOperation({ summary: 'Rank enabled models by overall, coding, cost, or speed score' })
  list(@Query() query: ListRankingsQuery): Promise<RankingListResponse> {
    return this.models.rankings(query)
  }
}
