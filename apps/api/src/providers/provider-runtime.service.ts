import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { ProviderProtocol } from '@gateway/contracts'
import { CredentialCipherService } from './credential-cipher.service'
import { ProviderChannelsRepository } from './provider-channels.repository'
import { ProvidersRepository } from './providers.repository'

export interface ProviderRuntimeTarget {
  provider: string
  model: string
  channelId?: string
  deploymentId?: string
}

interface ProviderRuntime {
  baseUrl: string
  protocol: ProviderProtocol
  mode: 'direct' | 'gateway'
  apiKey?: string
}

/** The request was rejected before any provider network dispatch occurred. */
export class ProviderDispatchNotStartedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProviderDispatchNotStartedError'
  }
}

@Injectable()
export class ProviderRuntimeService {
  constructor(
    private readonly channels: ProviderChannelsRepository,
    private readonly providers: ProvidersRepository,
    private readonly cipher: CredentialCipherService,
    private readonly config: ConfigService,
  ) {}

  async dispatch(target: ProviderRuntimeTarget, path: string, init: RequestInit): Promise<Response> {
    let runtime: ProviderRuntime
    try {
      runtime = await this.resolve(target)
    } catch (error) {
      if (error instanceof ProviderDispatchNotStartedError) throw error
      throw new ProviderDispatchNotStartedError('供应商运行时配置不可用')
    }
    const endpoint = `${runtime.baseUrl}/${path.replace(/^\/+/, '')}`
    const headers = new Headers(init.headers)
    headers.set('content-type', headers.get('content-type') ?? 'application/json')
    if (runtime.apiKey) headers.set('authorization', `Bearer ${runtime.apiKey}`)
    if (runtime.mode === 'gateway') {
      headers.set('x-portkey-provider', target.provider)
      if (target.channelId) headers.set('x-nexus-channel-id', target.channelId)
      if (target.deploymentId) headers.set('x-nexus-deployment-id', target.deploymentId)
    }
    return fetch(endpoint, { ...init, headers, redirect: 'error' })
  }

  private async resolve(target: ProviderRuntimeTarget): Promise<ProviderRuntime> {
    if (!target.channelId) return this.globalGateway()

    const channel = await this.channels.find(target.channelId)
    if (!channel || !channel.enabled) throw new ProviderDispatchNotStartedError('供应商渠道不存在或已停用')
    if (channel.provider !== target.provider) throw new ProviderDispatchNotStartedError('供应商渠道与路由目标不一致')
    if (!channel.credential?.enabled) throw new ProviderDispatchNotStartedError('供应商渠道凭证已停用')
    if (channel.credential.provider !== channel.provider || channel.credential.environment !== channel.environment) {
      throw new ProviderDispatchNotStartedError('供应商渠道凭证配置不一致')
    }
    const environment = this.config.get<string>('PROVIDER_CREDENTIAL_ENV', 'development')
    if (channel.environment !== environment) throw new ProviderDispatchNotStartedError('供应商渠道不属于当前运行环境')

    const provider = await this.providers.findByCode(channel.provider)
    if (!provider?.enabled) throw new ProviderDispatchNotStartedError('供应商不存在或已停用')
    if (provider.protocol !== 'openai_compatible') throw new ProviderDispatchNotStartedError(`供应商协议 ${provider.protocol} 尚未接入数据面`)
    if (!provider.baseUrl) throw new ProviderDispatchNotStartedError('供应商尚未配置 Base URL')

    return {
      baseUrl: this.trustedBaseUrl(provider.baseUrl),
      protocol: provider.protocol,
      mode: 'direct',
      apiKey: this.cipher.decrypt(channel.credential, channel.credential),
    }
  }

  private globalGateway(): ProviderRuntime {
    const baseUrl = this.config.get<string>('PROVIDER_GATEWAY_URL')
    if (!baseUrl) throw new ProviderDispatchNotStartedError('模型数据面尚未配置')
    return {
      baseUrl: this.trustedBaseUrl(baseUrl),
      protocol: 'openai_compatible',
      mode: 'gateway',
      apiKey: this.config.get<string>('PROVIDER_GATEWAY_API_KEY'),
    }
  }

  private trustedBaseUrl(value: string): string {
    let url: URL
    try {
      url = new URL(value)
    } catch {
      throw new ProviderDispatchNotStartedError('供应商 Base URL 无效')
    }
    if (url.username || url.password || url.search || url.hash) throw new ProviderDispatchNotStartedError('供应商 Base URL 不能包含凭证、查询参数或片段')

    const nodeEnv = this.config.get<string>('NODE_ENV', 'development')
    const loopback = ['localhost', '127.0.0.1', '::1'].includes(url.hostname.toLowerCase())
    if (url.protocol !== 'https:' && !(nodeEnv !== 'production' && url.protocol === 'http:' && loopback)) {
      throw new ProviderDispatchNotStartedError('供应商数据面必须使用 HTTPS')
    }

    const allowed = (this.config.get<string>('PROVIDER_OUTBOUND_HOSTS', '') ?? '')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean)
    if (!allowed.includes(url.hostname.toLowerCase()) && !(nodeEnv !== 'production' && loopback)) {
      throw new ProviderDispatchNotStartedError('供应商域名不在出站白名单中')
    }
    return url.toString().replace(/\/+$/, '')
  }
}
