import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class ListRequestLogsQuery {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  query?: string

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20
}
