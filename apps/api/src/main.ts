import 'reflect-metadata'
import type { IncomingHttpHeaders } from 'node:http'
import helmet from '@fastify/helmet'
import cookie from '@fastify/cookie'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Logger } from 'nestjs-pino'
import { AppModule } from './app.module'
import { ProblemDetailsFilter } from './common/filters/problem-details.filter'
import { parseTrustedProxyCidrs } from './config/trusted-proxy'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: parseTrustedProxyCidrs(process.env.TRUSTED_PROXY_CIDRS),
      bodyLimit: Number(process.env.REQUEST_BODY_LIMIT_BYTES ?? 1_048_576),
      genReqId: (request: { headers: IncomingHttpHeaders }) => {
        const correlationId = request.headers['x-request-id']
        const prefix = typeof correlationId === 'string' && /^[A-Za-z0-9_.:-]{1,32}$/.test(correlationId)
          ? `${correlationId}-`
          : ''
        return `${prefix}${crypto.randomUUID()}`
      },
    }),
    { bufferLogs: true },
  )
  const config = app.get(ConfigService)
  app.useLogger(app.get(Logger))
  // Nest's Fastify adapter owns its Fastify version; the cast prevents the
  // plugin peer package from introducing a duplicate nominal instance type.
  await app.register(helmet as never)
  await app.register(cookie as never)
  app.enableCors({
    origin: [config.getOrThrow<string>('WEB_ORIGIN'), config.getOrThrow<string>('ADMIN_ORIGIN')],
    credentials: true,
  })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, errorHttpStatusCode: 422 }))
  app.useGlobalFilters(new ProblemDetailsFilter())
  app.enableShutdownHooks()

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Model Gateway API')
      .setDescription('多模型聚合与 OpenAI 兼容 API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build(),
  )
  SwaggerModule.setup('docs', app, document)

  await app.listen(config.get<number>('PORT', 3000), '0.0.0.0')
}

void bootstrap()
