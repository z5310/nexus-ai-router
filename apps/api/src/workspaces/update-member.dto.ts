import { IsIn } from 'class-validator'
import type { UpdateWorkspaceMemberInput } from '@gateway/contracts'

export class UpdateMemberDto implements UpdateWorkspaceMemberInput {
  @IsIn(['admin', 'developer', 'billing', 'viewer'])
  role: UpdateWorkspaceMemberInput['role']
}
