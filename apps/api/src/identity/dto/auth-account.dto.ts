import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator'

const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/

export class RegisterDto {
  @ApiProperty({ example: '林宇', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'Nexus2026!', minLength: 10 })
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  @Matches(strongPassword, { message: '密码必须同时包含大写字母、小写字母和数字' })
  password: string

  @ApiProperty({ default: true })
  @IsBoolean()
  remember = true
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(32)
  token: string

  @ApiProperty({ example: 'NewNexus2026!', minLength: 10 })
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  @Matches(strongPassword, { message: '密码必须同时包含大写字母、小写字母和数字' })
  password: string
}

export class ChangePasswordDto {
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  currentPassword: string

  @ApiProperty({ example: 'NewNexus2026!', minLength: 10 })
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  @Matches(strongPassword, { message: '密码必须同时包含大写字母、小写字母和数字' })
  password: string
}
