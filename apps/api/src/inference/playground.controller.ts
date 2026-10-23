import { BadRequestException, Body, Controller, HttpCode, NotFoundException, Post, Req, UseGuards } from '@nestjs/common'
import { IsString, Length, MaxLength } from 'class-validator'
import { JwtAuthGuard } from '../identity/auth.guard'
import { WorkspaceContextGuard, type WorkspaceRequest } from '../workspaces/workspace-context.guard'
import { RequireWorkspacePermission } from '../workspaces/workspace-permissions'
import { InferenceService } from './inference.service'
import { InferenceRepository } from './inference.repository'

class PlaygroundDto {
  @IsString()
  @Length(1, 120)
  model: string

  @IsString()
  @Length(1, 8000)
  @MaxLength(8000)
  prompt: string
}

@Controller('api/console/playground')
@UseGuards(JwtAuthGuard, WorkspaceContextGuard)
@RequireWorkspacePermission('inference:execute')
export class PlaygroundController {
  constructor(private readonly inference: InferenceService, private readonly repository: InferenceRepository) {}

  @Post('chat')
  @HttpCode(200)
  async chat(@Body() input: PlaygroundDto, @Req() request: WorkspaceRequest) {
    const configured = await this.repository.findRoutableModel(request.workspace.id, input.model)
    if (!configured) throw new NotFoundException('请先在工作区启用此模型')
    if (configured.model.modelType !== 'text') throw new BadRequestException('当前在线体验仅支持文字模型')
    if (!input.prompt.trim()) throw new BadRequestException('请输入提示词')
    return this.inference.chat({ model: input.model, messages: [{ role: 'user', content: input.prompt }], max_tokens: 2048, stream: false }, {
      workspaceId: request.workspace.id, userId: request.user.sub,
    }, String(request.id))
  }
}
