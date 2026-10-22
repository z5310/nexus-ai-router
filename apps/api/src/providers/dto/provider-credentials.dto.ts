import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import type { ProviderEnvironment } from '../../database/entities/provider-credential.entity'

const environments = ['development', 'staging', 'production'] as const

export class ListProviderCredentialsQuery {
  @ApiPropertyOptional({ example: 'openai' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,39}$/)
  provider?: string

  @ApiPropertyOptional({ enum: environments })
  @IsOptional()
  @IsEnum(environments)
  environment?: ProviderEnvironment
}

export class CreateProviderCredentialDto {
  @ApiProperty({ example: 'openai' })
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,39}$/)
  provider: string

  @ApiProperty({ enum: environments })
  @IsEnum(environments)
  environment: ProviderEnvironment

  @ApiProperty({ example: 'OpenAI production primary' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string

  @ApiProperty({ description: 'Plaintext is encrypted immediately and is never returned' })
  @IsString()
  @MinLength(8)
  @MaxLength(4096)
  apiKey: string

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean
}

export class UpdateProviderCredentialDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string

  @ApiPropertyOptional({ description: 'Supplying a new value rotates the encrypted secret' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(4096)
  apiKey?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean
}
