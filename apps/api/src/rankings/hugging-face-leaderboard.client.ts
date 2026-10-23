import { Injectable, ServiceUnavailableException } from '@nestjs/common'

export interface ExternalLeaderboardEntry {
  rank: number
  modelId: string
  value: number
  verified: boolean
  author: string | null
}

@Injectable()
export class HuggingFaceLeaderboardClient {
  async fetch(datasetId: string): Promise<ExternalLeaderboardEntry[]> {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(datasetId)) throw new ServiceUnavailableException('榜单数据集标识不合法')
    const path = datasetId.split('/').map(encodeURIComponent).join('/')
    const response = await fetch(`https://huggingface.co/api/datasets/${path}/leaderboard`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Nexus-AI-Router/0.1' },
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) throw new ServiceUnavailableException(`Hugging Face 榜单请求失败（${response.status}）`)
    const payload = await response.json() as unknown
    const rows = Array.isArray(payload) ? payload : this.record(payload).data
    if (!Array.isArray(rows)) throw new ServiceUnavailableException('Hugging Face 榜单响应格式不受支持')
    const unique = new Map<string, ExternalLeaderboardEntry>()
    rows.forEach((raw, index) => {
      const row = this.record(raw)
      const rawModelId = typeof row.modelId === 'string' ? row.modelId : row.model_id
      const modelId = typeof rawModelId === 'string' ? rawModelId.trim() : ''
      const value = Number(row.value)
      if (!modelId || !Number.isFinite(value) || unique.has(modelId)) return
      unique.set(modelId, {
        rank: Number.isInteger(Number(row.rank)) && Number(row.rank) > 0 ? Number(row.rank) : index + 1,
        modelId, value, verified: row.verified === true, author: this.author(row.author),
      })
    })
    return [...unique.values()].sort((a, b) => a.rank - b.rank)
  }

  private record(value: unknown): Record<string, unknown> {
    return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {}
  }

  private author(value: unknown): string | null {
    if (typeof value === 'string') return value.slice(0, 160)
    const author = this.record(value)
    const name = typeof author.name === 'string' ? author.name : typeof author.fullname === 'string' ? author.fullname : null
    return name?.slice(0, 160) ?? null
  }
}
