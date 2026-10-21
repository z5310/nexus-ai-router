import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsEmail, IsString, MinLength } from 'class-validator'

export class LoginDto {
  @ApiProperty({ example: 'admin@nexus.cn' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'Nexus@123456', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string

  @ApiProperty({ default: false })
  @IsBoolean()
  remember = false
}
