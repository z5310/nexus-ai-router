import { BadGatewayException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import type { ProviderDeploymentTestResult } from '@gateway/contracts'
import { ModelDeploymentsRepository } from './model-deployments.repository'
import { ProviderChannelsRepository } from './provider-channels.repository'
import { ProviderDispatchNotStartedError, ProviderRuntimeService } from './provider-runtime.service'

@Injectable()
export class ProviderConnectivityService {
  constructor(
    private readonly deployments: ModelDeploymentsRepository,
    private readonly channels: ProviderChannelsRepository,
    private readonly runtime: ProviderRuntimeService,
  ) {}

  async testDeployment(id: string): Promise<ProviderDeploymentTestResult> {
    const deployment = await this.deployments.find(id)
    if (!deployment) throw new NotFoundException('模型部署不存在')
    const startedAt = performance.now()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), Math.min(deployment.channel.timeoutMs, 15_000))
    try {
      const response = await this.runtime.dispatch({
        provider: deployment.channel.provider,
        model: deployment.upstreamModelId,
        channelId: deployment.channelId,
        deploymentId: deployment.id,
      }, 'models', { method: 'GET', signal: controller.signal })
      if (!response.ok) {
        await response.body?.cancel()
        await this.channels.recordFailure(deployment.channelId, `probe_${response.status}`)
        throw new BadGatewayException(`供应商连接测试失败 (${response.status})`)
      }
      let payload: { data?: Array<{ id?: unknown }> }
      try {
        payload = await response.json() as { data?: Array<{ id?: unknown }> }
      } catch {
        await this.channels.recordFailure(deployment.channelId, 'probe_invalid_response')
        throw new BadGatewayException('供应商连接测试返回无效数据')
      }
      const models = Array.isArray(payload.data) ? payload.data : []
      const modelAvailable = models.some((item) => item?.id === deployment.upstreamModelId)
      if (!modelAvailable) {
        await this.channels.recordFailure(deployment.channelId, 'probe_model_not_found')
        throw new BadGatewayException('供应商连接成功，但未找到配置的上游模型')
      }
      await this.channels.recordSuccess(deployment.channelId)
      return {
        deploymentId: deployment.id,
        channelId: deployment.channelId,
        provider: deployment.channel.provider,
        upstreamModelId: deployment.upstreamModelId,
        latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
        checkedAt: new Date().toISOString(),
      }
    } catch (error) {
      if (error instanceof ProviderDispatchNotStartedError) throw new ServiceUnavailableException(error.message)
      if (error instanceof BadGatewayException || error instanceof ServiceUnavailableException) throw error
      if (error instanceof Error && error.name === 'AbortError') {
        await this.channels.recordFailure(deployment.channelId, 'probe_timeout')
        throw new ServiceUnavailableException('供应商连接测试超时')
      }
      await this.channels.recordFailure(deployment.channelId, 'probe_network_error')
      throw new ServiceUnavailableException('供应商连接测试失败')
    } finally {
      clearTimeout(timer)
    }
  }
}
