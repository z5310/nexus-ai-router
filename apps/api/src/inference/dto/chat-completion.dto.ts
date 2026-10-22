import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import type { OpenAIChatRole } from '@gateway/contracts'

export class ChatMessageDto {
  @ApiProperty({ enum: ['system', 'user', 'assistant'] })
  @IsIn(['system', 'user', 'assistant'])
  role: OpenAIChatRole

  @ApiProperty()
  @IsString()
  @MaxLength(1_000_000)
  content: string
}

export class ChatCompletionDto {
  @ApiProperty({ example: 'openai/gpt-6.1-sol' })
  @IsString()
  @MaxLength(120)
  model: string

  @ApiProperty({ type: [ChatMessageDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[]

  @ApiPropertyOptional({ minimum: 0, maximum: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number

  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  top_p?: number

  @ApiPropertyOptional({ minimum: 1, maximum: 1_000_000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  max_tokens?: number

  @ApiPropertyOptional({ default: false, description: 'Streaming will be added in the next milestone' })
  @IsOptional()
  @IsBoolean()
  stream?: boolean

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  user?: string
}
