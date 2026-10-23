import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator'
import type { RankingMetric, RankingSourceAdapter } from '@gateway/contracts'

const adapters = ['huggingface'] as const
const metrics = ['overall', 'coding', 'cost', 'speed'] as const

export class CreateRankingSourceDto {
  @ApiProperty({ example: 'swe-bench-verified' }) @IsString() @Matches(/^[a-z0-9][a-z0-9-]{1,59}$/) code: string
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) name: string
  @ApiProperty({ enum: adapters }) @IsEnum(adapters) adapter: RankingSourceAdapter
  @ApiProperty({ example: 'SWE-bench/SWE-bench_Verified' }) @IsString() @Matches(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/) @MaxLength(200) datasetId: string
  @ApiProperty({ enum: metrics }) @IsEnum(metrics) metric: RankingMetric
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsNumber() @Min(0.0001) @Max(1000) scoreMultiplier?: number
  @ApiPropertyOptional({ default: 100 }) @IsOptional() @IsInt() @Min(0) @Max(10000) priority?: number
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() enabled?: boolean
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) attributionLabel: string
}

export class UpdateRankingSourceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string
  @ApiPropertyOptional({ enum: metrics }) @IsOptional() @IsEnum(metrics) metric?: RankingMetric
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.0001) @Max(1000) scoreMultiplier?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(10000) priority?: number
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(120) attributionLabel?: string
}

export class UpsertBenchmarkMappingDto {
  @ApiProperty() @IsUUID() modelId: string
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(240) externalModelId: string
}
