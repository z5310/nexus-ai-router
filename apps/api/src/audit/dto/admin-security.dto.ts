import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class ListAuditLogsQuery {
  @IsOptional() @IsString() @MaxLength(120) query?: string
  @IsOptional() @IsString() @MaxLength(100) action?: string
  @IsOptional() @IsString() @MaxLength(80) resourceType?: string
  @IsOptional() @IsEnum(['success', 'failure']) outcome?: 'success' | 'failure'
  @Type(() => Number) @IsInt() @Min(1) page = 1
  @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 30
}

export class ListAdminSessionsQuery {
  @IsOptional() @IsString() @MaxLength(120) query?: string
  @IsOptional() @IsEnum(['active', 'revoked', 'expired']) status?: 'active' | 'revoked' | 'expired'
  @Type(() => Number) @IsInt() @Min(1) page = 1
  @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 30
}
