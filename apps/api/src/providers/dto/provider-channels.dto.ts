import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator'
import type { ProviderEnvironment } from '../../database/entities/provider-credential.entity'

const environments = ['development', 'staging', 'production'] as const

export class ListProviderChannelsQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,39}$/)
  provider?: string

  @ApiPropertyOptional({ enum: environments })
  @IsOptional()
  @IsEnum(environments)
  environment?: ProviderEnvironment
}

export class CreateProviderChannelDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string

  @ApiProperty()
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,39}$/)
  provider: string

  @ApiProperty({ enum: environments })
  @IsEnum(environments)
  environment: ProviderEnvironment

  @ApiProperty()
  @IsUUID()
  credentialId: string

  @ApiPropertyOptional({ default: 'global' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,39}$/)
  region?: string

  @ApiPropertyOptional({ default: 60000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(300000)
  timeoutMs?: number

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  maxConcurrency?: number

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean
}

export class UpdateProviderChannelDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  credentialId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,39}$/)
  region?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(300000)
  timeoutMs?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  maxConcurrency?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean
}
