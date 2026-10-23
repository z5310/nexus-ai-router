import type { BillingBalance, BillingLedgerResponse, BillingPendingListResponse, BillingStatus } from '@gateway/contracts'
import { request } from '../../../lib/http'

export async function getBillingSummary(signal?: AbortSignal) {
  const [status, balance, pending] = await Promise.all([
    request<BillingStatus>({ url: '/api/billing/status', signal }),
    request<BillingBalance>({ url: '/api/billing/balance', signal }),
    request<BillingPendingListResponse>({ url: '/api/billing/pending', signal }),
  ])
  return { status, balance, pending }
}
export const getBillingLedger = (cursor?: string, signal?: AbortSignal) => request<BillingLedgerResponse>({ url: '/api/billing/ledger', params: { cursor }, signal })
