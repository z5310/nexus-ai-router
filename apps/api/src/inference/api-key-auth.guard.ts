import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { createHash } from 'node:crypto'
import type { FastifyRequest } from 'fastify'
import type { ApiKeyEntity } from '../database/entities/api-key.entity'
import { InferenceRepository } from './inference.repository'

export type ApiKeyRequest = FastifyRequest & { apiKey: ApiKeyEntity }

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly inference: InferenceRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ApiKeyRequest>()
    const authorization = request.headers.authorization?.trim().split(/\s+/) ?? []
    const [type, token] = authorization
    if (authorization.length !== 2 || type !== 'Bearer' || !token?.startsWith('nxs_live_')) {
      throw new UnauthorizedException('API Key 无效')
    }
    const key = await this.inference.findActiveKey(createHash('sha256').update(token).digest('hex'))
    if (!key) throw new UnauthorizedException('API Key 无效或已撤销')
    request.apiKey = key
    await this.inference.touchKey(key.id)
    return true
  }
}
