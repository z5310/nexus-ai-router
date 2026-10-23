import { Type } from 'class-transformer'
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator'

export class CreateAudioGenerationDto {
  @IsString()
  @Length(1, 120)
  model: string

  @IsString()
  @Length(1, 10_000)
  prompt: string

  @IsString()
  @Length(1, 80)
  voice: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  instruction?: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  language?: string

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  @Max(2)
  speech_rate: number

  @IsInt()
  @Min(-12)
  @Max(12)
  pitch: number

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(2)
  volume: number

  @IsInt()
  @IsIn([16_000, 24_000, 32_000, 44_100])
  sample_rate: number

  @IsInt()
  @IsIn([64_000, 128_000, 256_000])
  bitrate: number

  @IsIn(['mp3', 'wav', 'flac'])
  response_format: 'mp3' | 'wav' | 'flac'
}

export class ListAudioGenerationTasksQuery {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10
}
