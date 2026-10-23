import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, Min, ValidateIf } from 'class-validator'

export class AdminBillingListQuery {
  @IsOptional() @IsString() @Length(0, 80) query?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page: number = 1
}

export class AdminBillingActionDto {
  @IsUUID() operationId: string
  @IsString() @Length(5, 500) reason: string
  @IsString() @Length(3, 200) evidence: string
}

export class AdminBillingGrantDto extends AdminBillingActionDto {
  @IsString() @Matches(/^\d{1,12}(\.\d{1,6})?$/) amount: string
}

export class BillingPreviewDto {
  @IsIn(['settle', 'release']) action: 'settle' | 'release'
  @ValidateIf((input: BillingPreviewDto) => input.action === 'settle') @IsInt() @Min(0) @Max(2147483647) inputTokens?: number
  @ValidateIf((input: BillingPreviewDto) => input.action === 'settle') @IsInt() @Min(0) @Max(2147483647) outputTokens?: number
}

export class AdminBillingResolutionDto extends AdminBillingActionDto {
  @IsIn(['settle', 'release']) action: 'settle' | 'release'
  @ValidateIf((input: AdminBillingResolutionDto) => input.action === 'settle') @IsInt() @Min(0) @Max(2147483647) inputTokens?: number
  @ValidateIf((input: AdminBillingResolutionDto) => input.action === 'settle') @IsInt() @Min(0) @Max(2147483647) outputTokens?: number
}
