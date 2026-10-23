import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class ListAdminModelsQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  query?: string

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20
}

export class UpdateAdminModelDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  featured?: boolean

  @ApiPropertyOptional({ enum: ['stable', 'observing'] })
  @IsOptional()
  @IsEnum(['stable', 'observing'])
  status?: 'stable' | 'observing'
}

export class UpdateAdminModelPricingDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(99_999_999)
  originalInputPrice: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(99_999_999)
  originalOutputPrice: number | null

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercent: number

  @IsEnum(['million_tokens', 'image', 'second', '10k_chars'])
  priceUnit: 'million_tokens' | 'image' | 'second' | '10k_chars'
}
