import { HttpException, HttpStatus } from '@nestjs/common'

export class DistributedLimitException extends HttpException {
  constructor(message: string, readonly retryAfterSeconds: number) {
    super(message, HttpStatus.TOO_MANY_REQUESTS)
  }
}
