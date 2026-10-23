import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator'

export class ListModelDeploymentsQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  modelId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  channelId?: string
}

export class CreateModelDeploymentDto {
  @ApiProperty()
  @IsUUID()
  modelId: string

  @ApiProperty()
  @IsUUID()
  channelId: string

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  upstreamModelId: string

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  priority?: number

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  weight?: number

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean
}

export class UpdateModelDeploymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  upstreamModelId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  priority?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  weight?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean
}
