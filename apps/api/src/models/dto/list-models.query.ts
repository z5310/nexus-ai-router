import { Transform, Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'
import type { ModelType, RankingMetric } from '@gateway/contracts'

const modelTypes: ModelType[] = ['text', 'image', 'video', 'audio', 'embedding']
const rankingMetrics: RankingMetric[] = ['overall', 'coding', 'cost', 'speed']

export class ListModelsQuery {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  query?: string

  @IsOptional()
  @IsIn(modelTypes)
  type?: ModelType

  @IsOptional()
  @IsString()
  @MaxLength(60)
  provider?: string

  @IsOptional()
  @IsIn(['recommended', 'score', 'speed', 'price'])
  sort: 'recommended' | 'score' | 'speed' | 'price' = 'recommended'

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20
}

export class ListRankingsQuery {
  @IsOptional()
  @IsIn(rankingMetrics)
  metric: RankingMetric = 'overall'

  @IsOptional()
  @IsString()
  @MaxLength(60)
  provider?: string

  @IsOptional()
  @IsIn(['stable', 'observing'])
  status?: 'stable' | 'observing'

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === undefined ? undefined : Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50
}
