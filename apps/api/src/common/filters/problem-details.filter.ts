import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import { DistributedLimitException } from '../../traffic-control/distributed-limit.exception'

interface FastifyRequestLike {
  id?: string
  url: string
  headers: Record<string, string | string[] | undefined>
}

interface FastifyReplyLike {
  header(name: string, value: string | number): FastifyReplyLike
  status(code: number): FastifyReplyLike
  send(body: unknown): void
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp()
    const request = context.getRequest<FastifyRequestLike>()
    const reply = context.getResponse<FastifyReplyLike>()
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    const response = exception instanceof HttpException ? exception.getResponse() : null
    const detail = this.detail(response, exception, status)

    if (exception instanceof DistributedLimitException) reply.header('retry-after', exception.retryAfterSeconds)

    reply.status(status).send({
      type: `https://httpstatuses.com/${status}`,
      title: HttpStatus[status] ?? 'Error',
      status,
      detail,
      instance: request.url,
      request_id: request.id ?? request.headers['x-request-id'] ?? 'unknown',
      timestamp: new Date().toISOString(),
    })
  }

  private detail(response: string | object | null, exception: unknown, status: number): string | string[] {
    if (typeof response === 'string') return response
    if (response && 'message' in response) {
      const message = (response as { message: unknown }).message
      if (typeof message === 'string' || (Array.isArray(message) && message.every((item) => typeof item === 'string'))) return message
    }
    if (status >= 500) return 'An unexpected error occurred'
    return exception instanceof Error ? exception.message : 'Request failed'
  }
}
