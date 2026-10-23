import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ArrayUnique, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, MinLength } from 'class-validator'
import type { ModelType, ProviderProtocol } from '@gateway/contracts'

const protocols = ['openai_compatible', 'anthropic', 'google', 'custom'] as const
const capabilities = ['text', 'image', 'video', 'audio', 'embedding'] as const

export class ListProvidersQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean
}

export class CreateProviderDto {
  @ApiProperty({ example: 'openai' })
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,39}$/)
  code: string

  @ApiProperty({ example: 'OpenAI' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string

  @ApiProperty({ enum: protocols })
  @IsEnum(protocols)
  protocol: ProviderProtocol

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  baseUrl?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  docsUrl?: string

  @ApiProperty({ enum: capabilities, isArray: true })
  @IsArray()
  @ArrayUnique()
  @IsEnum(capabilities, { each: true })
  capabilities: ModelType[]

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number
}

export class UpdateProviderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string

  @ApiPropertyOptional({ enum: protocols })
  @IsOptional()
  @IsEnum(protocols)
  protocol?: ProviderProtocol

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  baseUrl?: string | null

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  docsUrl?: string | null

  @ApiPropertyOptional({ enum: capabilities, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(capabilities, { each: true })
  capabilities?: ModelType[]

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number
}
