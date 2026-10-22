import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator'
import type { RouteMatchType, RouteStrategy } from '@gateway/contracts'

const MATCH_TYPES: RouteMatchType[] = ['all', 'text', 'image', 'video', 'audio', 'embedding']
const STRATEGIES: RouteStrategy[] = ['priority', 'lowest_cost', 'lowest_latency']

export class CreateRouteRuleDto {
  @IsString()
  @Length(2, 80)
  name: string

  @IsIn(MATCH_TYPES)
  matchType: RouteMatchType

  @IsIn(STRATEGIES)
  strategy: RouteStrategy

  @IsUUID()
  primaryModelId: string

  @IsOptional()
  @IsUUID()
  fallbackModelId?: string | null

  @IsInt()
  @Min(1)
  @Max(100)
  trafficPercent: number

  @IsBoolean()
  enabled: boolean
}

export class UpdateRouteRuleDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string

  @IsOptional()
  @IsIn(MATCH_TYPES)
  matchType?: RouteMatchType

  @IsOptional()
  @IsIn(STRATEGIES)
  strategy?: RouteStrategy

  @IsOptional()
  @IsUUID()
  primaryModelId?: string

  @IsOptional()
  @IsUUID()
  fallbackModelId?: string | null

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  trafficPercent?: number

  @IsOptional()
  @IsBoolean()
  enabled?: boolean
}
