import { Injectable } from '@nestjs/common'

type Labels = Record<string, string>

interface CounterValue { labels: Labels; value: number }
interface HistogramValue { labels: Labels; count: number; sum: number; buckets: number[] }

const DURATION_BUCKETS = [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60]

@Injectable()
export class ObservabilityService {
  private readonly startedAt = Date.now() / 1_000
  private readonly counters = new Map<string, Map<string, CounterValue>>()
  private readonly histograms = new Map<string, Map<string, HistogramValue>>()
  private readonly gauges = new Map<string, Map<string, CounterValue>>()

  recordHttp(method: string, route: string, statusCode: number, durationMs: number): void {
    const labels = { method: this.clean(method.toUpperCase()), route: this.clean(route), status_code: String(statusCode) }
    this.increment('nexus_http_requests_total', labels)
    this.observe('nexus_http_request_duration_seconds', { method: labels.method, route: labels.route, status_class: `${Math.floor(statusCode / 100)}xx` }, durationMs / 1_000)
  }

  recordInference(input: {
    modelPublicId: string
    status: 'success' | 'failed'
    latencyMs: number
    firstTokenLatencyMs: number | null
    attempts: Array<{ provider: string; status: string; latencyMs: number; errorCode: string | null }>
  }): void {
    const labels = { model: this.clean(input.modelPublicId), status: input.status }
    this.increment('nexus_inference_requests_total', labels)
    this.observe('nexus_inference_request_duration_seconds', labels, input.latencyMs / 1_000)
    if (input.firstTokenLatencyMs !== null) {
      this.observe('nexus_inference_first_token_duration_seconds', { model: labels.model }, input.firstTokenLatencyMs / 1_000)
    }
    for (const attempt of input.attempts) {
      const attemptLabels = {
        provider: this.clean(attempt.provider),
        status: this.clean(attempt.status),
        error_code: this.clean(attempt.errorCode ?? 'none'),
      }
      this.increment('nexus_provider_attempts_total', attemptLabels)
      this.observe('nexus_provider_attempt_duration_seconds', { provider: attemptLabels.provider, status: attemptLabels.status }, attempt.latencyMs / 1_000)
    }
  }

  setDependencyReady(dependency: string, ready: boolean): void {
    this.setGauge('nexus_dependency_ready', { dependency: this.clean(dependency) }, ready ? 1 : 0)
  }

  setQueueJobs(queue: string, state: string, value: number): void {
    this.setGauge('nexus_queue_jobs', { queue: this.clean(queue), state: this.clean(state) }, value)
  }

  setProviderChannels(provider: string, status: string, value: number): void {
    this.setGauge('nexus_provider_channels', { provider: this.clean(provider), status: this.clean(status) }, value)
  }

  resetProviderChannels(): void {
    this.gauges.delete('nexus_provider_channels')
  }

  setCollectorSuccess(collector: string, success: boolean): void {
    this.setGauge('nexus_collector_success', { collector: this.clean(collector) }, success ? 1 : 0)
  }

  render(): string {
    const lines = [
      '# HELP nexus_process_start_time_seconds Start time of the API process since unix epoch.',
      '# TYPE nexus_process_start_time_seconds gauge',
      `nexus_process_start_time_seconds ${this.startedAt}`,
      '# HELP nexus_http_requests_total HTTP requests completed by the API.',
      '# TYPE nexus_http_requests_total counter',
      ...this.renderValues('nexus_http_requests_total', this.counters),
      '# HELP nexus_http_request_duration_seconds End-to-end HTTP request duration.',
      '# TYPE nexus_http_request_duration_seconds histogram',
      ...this.renderHistograms('nexus_http_request_duration_seconds'),
      '# HELP nexus_inference_requests_total Inference requests by model and outcome.',
      '# TYPE nexus_inference_requests_total counter',
      ...this.renderValues('nexus_inference_requests_total', this.counters),
      '# HELP nexus_inference_request_duration_seconds Total inference request duration.',
      '# TYPE nexus_inference_request_duration_seconds histogram',
      ...this.renderHistograms('nexus_inference_request_duration_seconds'),
      '# HELP nexus_inference_first_token_duration_seconds Time to first streamed token.',
      '# TYPE nexus_inference_first_token_duration_seconds histogram',
      ...this.renderHistograms('nexus_inference_first_token_duration_seconds'),
      '# HELP nexus_provider_attempts_total Provider attempts by outcome.',
      '# TYPE nexus_provider_attempts_total counter',
      ...this.renderValues('nexus_provider_attempts_total', this.counters),
      '# HELP nexus_provider_attempt_duration_seconds Provider attempt duration.',
      '# TYPE nexus_provider_attempt_duration_seconds histogram',
      ...this.renderHistograms('nexus_provider_attempt_duration_seconds'),
      '# HELP nexus_dependency_ready Whether a required dependency passed its latest bounded readiness check.',
      '# TYPE nexus_dependency_ready gauge',
      ...this.renderValues('nexus_dependency_ready', this.gauges),
      '# HELP nexus_queue_jobs Current jobs in an asynchronous queue by state.',
      '# TYPE nexus_queue_jobs gauge',
      ...this.renderValues('nexus_queue_jobs', this.gauges),
      '# HELP nexus_provider_channels Configured provider channels by persisted health state.',
      '# TYPE nexus_provider_channels gauge',
      ...this.renderValues('nexus_provider_channels', this.gauges),
      '# HELP nexus_collector_success Whether a scrape-time collector completed successfully.',
      '# TYPE nexus_collector_success gauge',
      ...this.renderValues('nexus_collector_success', this.gauges),
    ]
    return `${lines.join('\n')}\n`
  }

  private increment(name: string, labels: Labels): void {
    const metric = this.counters.get(name) ?? new Map<string, CounterValue>()
    this.counters.set(name, metric)
    const key = this.key(labels)
    const current = metric.get(key)
    metric.set(key, { labels, value: (current?.value ?? 0) + 1 })
  }

  private observe(name: string, labels: Labels, value: number): void {
    const metric = this.histograms.get(name) ?? new Map<string, HistogramValue>()
    this.histograms.set(name, metric)
    const key = this.key(labels)
    const current = metric.get(key) ?? { labels, count: 0, sum: 0, buckets: DURATION_BUCKETS.map(() => 0) }
    current.count += 1
    current.sum += Math.max(0, value)
    DURATION_BUCKETS.forEach((bucket, index) => { if (value <= bucket) current.buckets[index] += 1 })
    metric.set(key, current)
  }

  private setGauge(name: string, labels: Labels, value: number): void {
    const metric = this.gauges.get(name) ?? new Map<string, CounterValue>()
    this.gauges.set(name, metric)
    metric.set(this.key(labels), { labels, value: Number.isFinite(value) ? value : 0 })
  }

  private renderValues(name: string, source: Map<string, Map<string, CounterValue>>): string[] {
    return [...(source.get(name)?.values() ?? [])].map(({ labels, value }) => `${name}${this.formatLabels(labels)} ${value}`)
  }

  private renderHistograms(name: string): string[] {
    const lines: string[] = []
    for (const value of this.histograms.get(name)?.values() ?? []) {
      value.buckets.forEach((count, index) => lines.push(`${name}_bucket${this.formatLabels({ ...value.labels, le: String(DURATION_BUCKETS[index]) })} ${count}`))
      lines.push(`${name}_bucket${this.formatLabels({ ...value.labels, le: '+Inf' })} ${value.count}`)
      lines.push(`${name}_sum${this.formatLabels(value.labels)} ${value.sum}`)
      lines.push(`${name}_count${this.formatLabels(value.labels)} ${value.count}`)
    }
    return lines
  }

  private key(labels: Labels): string {
    return Object.entries(labels).sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join('|')
  }

  private formatLabels(labels: Labels): string {
    const entries = Object.entries(labels)
    if (entries.length === 0) return ''
    return `{${entries.map(([key, value]) => `${key}="${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n')}"`).join(',')}}`
  }

  private clean(value: string): string {
    return value.slice(0, 120).replace(/[\r\n]/g, '_') || 'unknown'
  }
}
