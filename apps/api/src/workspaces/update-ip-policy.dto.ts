import { ArrayMaxSize, IsArray, IsBoolean, IsString, MaxLength } from 'class-validator'

export class UpdateIpPolicyDto {
  @IsBoolean()
  enabled: boolean

  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  networks: string[]
}
