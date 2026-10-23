import type { BillingAdminDetail, BillingAdminWorkspaceList, BillingLedgerResponse, BillingAdminGrantInput, BillingAdminResolutionInput, BillingAdminActionResult, BillingResolutionPreview } from '@gateway/contracts'
import { request } from '../../../lib/http'

export const getBillingWorkspaces = (query: string, page: number, signal?: AbortSignal) => request<BillingAdminWorkspaceList>({ url: '/api/admin/billing/workspaces', params: { query, page }, signal })
export const getBillingDetail = (id: string, signal?: AbortSignal) => request<BillingAdminDetail>({ url: `/api/admin/billing/${id}`, signal })
export const getBillingLedger = (id: string, cursor?: string, signal?: AbortSignal) => request<BillingLedgerResponse>({ url: `/api/admin/billing/${id}/ledger`, params: { cursor }, signal })
export const grantBillingCredit = (id: string, data: BillingAdminGrantInput) => request<BillingAdminActionResult>({ method: 'POST', url: `/api/admin/billing/${id}/grants`, data })
export const resolveBilling = (id: string, reference: string, data: BillingAdminResolutionInput) => request<BillingAdminActionResult>({ method: 'POST', url: `/api/admin/billing/${id}/reservations/${encodeURIComponent(reference)}/resolve`, data })
export const previewBilling = (id: string, reference: string, data: Pick<BillingAdminResolutionInput, 'action' | 'inputTokens' | 'outputTokens'>) => request<BillingResolutionPreview>({ method: 'POST', url: `/api/admin/billing/${id}/reservations/${encodeURIComponent(reference)}/preview`, data })
