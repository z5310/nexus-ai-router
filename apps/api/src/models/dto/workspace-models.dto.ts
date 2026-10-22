import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator'

export class CreateWorkspaceModelDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  modelId: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  alias?: string

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  priority = 50

  @ApiPropertyOptional({ default: 60, minimum: 1, maximum: 100000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  rateLimitRpm = 60

  @ApiPropertyOptional({ nullable: true, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  dailyBudgetCny?: number | null

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled = true
}

export class UpdateWorkspaceModelDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  alias?: string | null

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  priority?: number

  @ApiPropertyOptional({ minimum: 1, maximum: 100000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  rateLimitRpm?: number

  @ApiPropertyOptional({ nullable: true, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  dailyBudgetCny?: number | null

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean
}
