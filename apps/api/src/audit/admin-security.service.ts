import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { AdminSessionListResponse } from '@gateway/contracts'
import { SessionsRepository } from '../identity/sessions.repository'
import type { ListAdminSessionsQuery } from './dto/admin-security.dto'

@Injectable()
export class AdminSecurityService {
  constructor(private readonly sessions: SessionsRepository) {}

  async listSessions(query: ListAdminSessionsQuery, currentSessionId: string): Promise<AdminSessionListResponse> {
    const [rows, total] = await this.sessions.listForAdmin(query)
    const now = Date.now()
    return {
      data: rows.map((session) => ({
        id: session.id,
        user: { id: session.user.id, name: session.user.name, email: session.user.email, role: session.user.role, status: session.user.status },
        status: session.revokedAt ? 'revoked' : session.expiresAt.getTime() <= now ? 'expired' : 'active',
        current: session.id === currentSessionId,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        lastSeenAt: session.lastSeenAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        revokedAt: session.revokedAt?.toISOString() ?? null,
      })),
      pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
    }
  }

  async revokeSession(id: string, currentSessionId: string): Promise<void> {
    if (id === currentSessionId) throw new BadRequestException('请使用退出登录结束当前会话')
    if (!(await this.sessions.revokeByAdmin(id))) throw new NotFoundException('有效登录会话不存在')
  }
}
