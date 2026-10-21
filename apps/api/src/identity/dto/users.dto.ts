import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'
import type { UserRole, UserStatus } from '@gateway/contracts'

const roles = ['admin', 'manager', 'viewer'] as const
const statuses = ['active', 'suspended', 'invited'] as const

export class ListUsersQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  query?: string

  @ApiPropertyOptional({ enum: roles })
  @IsOptional()
  @IsEnum(roles)
  role?: UserRole

  @ApiPropertyOptional({ enum: statuses })
  @IsOptional()
  @IsEnum(statuses)
  status?: UserStatus

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20
}

export class CreateUserDto {
  @ApiProperty({ example: '张晨' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string

  @ApiProperty({ example: 'user@nexus.cn' })
  @IsEmail()
  email: string

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string

  @ApiProperty({ enum: roles })
  @IsEnum(roles)
  role: UserRole

  @ApiProperty({ enum: statuses, default: 'active' })
  @IsEnum(statuses)
  status: UserStatus = 'active'
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
