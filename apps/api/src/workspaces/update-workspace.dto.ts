import { Transform } from 'class-transformer'
import { IsIn, IsString, Length } from 'class-validator'

export class UpdateWorkspaceDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(1, 100)
  name: string

  @IsIn(['CNY', 'USD'])
  defaultCurrency: string
}
