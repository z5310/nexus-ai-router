import type { BillingBalance, BillingLedgerResponse, BillingPendingListResponse, BillingStatus, BillingUsageReport } from '@gateway/contracts'
import { request } from '../../../lib/http'

export async function getBillingSummary(signal?: AbortSignal) {
  const [status, balance, pending] = await Promise.all([
    request<BillingStatus>({ url: '/api/billing/status', signal }),
    request<BillingBalance>({ url: '/api/billing/balance', signal }),
    request<BillingPendingListResponse>({ url: '/api/billing/pending', signal }),
  ])
  return { status, balance, pending }
}
export type BillingPeriod = { from: string; to: string }
export const getBillingLedger = (period: BillingPeriod, cursor?: string, signal?: AbortSignal) => request<BillingLedgerResponse>({ url: '/api/billing/ledger', params: { cursor, ...period }, signal })
export const getBillingUsage = (period: BillingPeriod, signal?: AbortSignal) => request<BillingUsageReport>({ url: '/api/billing/usage', params: period, signal })
