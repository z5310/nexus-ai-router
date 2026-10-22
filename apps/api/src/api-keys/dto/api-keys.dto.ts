import { ApiProperty } from '@nestjs/swagger'
import { IsString, MaxLength, MinLength } from 'class-validator'

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Production' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string
}
