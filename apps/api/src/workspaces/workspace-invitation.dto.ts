import { IsEmail, IsIn, IsString, IsUUID, Matches, MaxLength } from 'class-validator'
import type { CreateWorkspaceInvitationInput, TransferWorkspaceOwnershipInput } from '@gateway/contracts'

export class CreateWorkspaceInvitationDto implements CreateWorkspaceInvitationInput {
  @IsEmail()
  @MaxLength(180)
  email: string

  @IsIn(['admin', 'developer', 'billing', 'viewer'])
  role: CreateWorkspaceInvitationInput['role']
}

export class TransferWorkspaceOwnershipDto implements TransferWorkspaceOwnershipInput {
  @IsUUID()
  memberId: string
}

export class AcceptWorkspaceInvitationDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{40,100}$/)
  token: string
}
