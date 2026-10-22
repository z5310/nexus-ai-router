import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'

interface OpenAIReply {
  status(code: number): OpenAIReply
  send(body: unknown): void
}

interface RequestLike {
  id?: string
  headers: Record<string, string | string[] | undefined>
}

@Catch()
export class OpenAIErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp()
    const request = context.getRequest<RequestLike>()
    const reply = context.getResponse<OpenAIReply>()
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    const response = exception instanceof HttpException ? exception.getResponse() : null
    reply.status(status).send({
      error: {
        message: this.message(response, status),
        type: this.type(status),
        param: null,
        code: HttpStatus[status]?.toLowerCase() ?? 'internal_server_error',
      },
      request_id: request.id ?? request.headers['x-request-id'] ?? 'unknown',
    })
  }

  private message(response: string | object | null, status: number): string {
    if (status >= 500) return '上游模型服务暂不可用'
    if (typeof response === 'string') return response
    if (response && 'message' in response) {
      const message = (response as { message: unknown }).message
      if (typeof message === 'string') return message
      if (Array.isArray(message)) return message.filter((item): item is string => typeof item === 'string').join('; ')
    }
    return '请求失败'
  }

  private type(status: number): string {
    if (status === 401) return 'authentication_error'
    if (status === 403) return 'permission_error'
    if (status === 429) return 'rate_limit_error'
    if (status >= 500) return 'api_error'
    return 'invalid_request_error'
  }
}
