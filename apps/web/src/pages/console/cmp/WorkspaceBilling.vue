<script setup lang="ts">
import { computed } from 'vue'
import { useInfiniteQuery, useQuery } from '@tanstack/vue-query'
import { RefreshCw } from 'lucide-vue-next'
import { activeWorkspaceId, workspaceQueryKey } from '../../../stores/workspace'
import { getBillingLedger, getBillingSummary } from '../api/billing'

const enabled = computed(() => Boolean(activeWorkspaceId.value))
const summary = useQuery({ queryKey: computed(() => workspaceQueryKey('billing-summary')), queryFn: ({ signal }) => getBillingSummary(signal), enabled, refetchInterval: 30000, retry: 1 })
const ledger = useInfiniteQuery({ queryKey: computed(() => workspaceQueryKey('billing-ledger')), initialPageParam: '', queryFn: ({ pageParam, signal }) => getBillingLedger(pageParam || undefined, signal), getNextPageParam: (page) => page.nextCursor ?? undefined, enabled, retry: 1 })
const rows = computed(() => ledger.data.value?.pages.flatMap((page) => page.data) ?? [])
const kinds = { grant: '额度入账', reserve: '调用预占', settle: '用量结算', release: '预占释放' }
const states: Record<string, string> = { prepared: '准备调用', dispatched: '等待上游结果', settle: '等待结算', release: '等待释放', review: '待人工对账' }
const reasons: Record<string, string> = { upstream_usage_unknown: '上游用量尚未确认', process_outcome_unknown: '调用结果需要核实', settlement_funds_insufficient: '可用额度不足，等待补足', settlement_retry_pending: '结算等待恢复处理' }
const date = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false })
const tokenUsage = (input: number | null, output: number | null) => input === null || output === null ? '' : `${input.toLocaleString()} 输入 · ${output.toLocaleString()} 输出 Tokens`
const priceUnit = (value: string | undefined) => ({ million_tokens: '/ 1M Tokens', image: '/ 张', second: '/ 秒', '10k_chars': '/ 万字符' }[value ?? ''] ?? '')
function refresh() { void Promise.all([summary.refetch(), ledger.refetch()]) }
</script>

<template>
  <div class="grid gap-5 text-[14px] text-white">
    <div class="flex flex-wrap items-center justify-between gap-3"><p class="m-0 text-[#b9c9bf]">额度与流水按 CNY 记账，金额保留六位小数。</p><button class="console-secondary-action" :disabled="summary.isFetching.value || ledger.isFetching.value" @click="refresh"><RefreshCw :size="16" />刷新</button></div>
    <div v-if="summary.isPending.value" class="console-state" role="status">正在读取账户额度…</div>
    <div v-else-if="summary.isError.value" class="console-state error" role="alert"><span>{{ summary.error.value?.message || '账户读取失败' }}</span><button class="console-secondary-action" @click="summary.refetch()">重试</button></div>
    <template v-else-if="summary.data.value">
      <div class="grid gap-3 md:grid-cols-3"><article class="console-surface p-5"><p class="m-0 text-[#b9c9bf]">可用额度</p><strong class="mt-3 block break-all text-[26px]">¥ {{ summary.data.value.balance.available }}</strong></article><article class="console-surface p-5"><p class="m-0 text-[#b9c9bf]">冻结额度</p><strong class="mt-3 block break-all text-[26px]">¥ {{ summary.data.value.balance.reserved }}</strong><p class="mb-0 mt-2 text-[12px] text-[#b9c9bf]">预占尚未结清，不等于已消费。</p></article><article class="console-surface p-5"><p class="m-0 text-[#b9c9bf]">Chat 自动计费</p><strong class="mt-3 block text-[22px]">{{ summary.data.value.status.chatEnabled ? '已启用' : '未启用' }}</strong><p class="mb-0 mt-2 leading-6 text-[#b9c9bf]">{{ summary.data.value.status.chatEnabled ? '调用前预占，按已确认用量结算。' : '当前工作区不会自动扣费，已有额度和流水仍可查看。' }}</p></article></div>
      <section class="console-surface p-5"><h2 class="m-0 text-[17px]">未结预占</h2><p class="mt-2 leading-6 text-[#b9c9bf]">用量未知的调用会保留额度，由平台核实后结算或释放。显示最早的 50 条。</p><p v-if="!summary.data.value.pending.data.length" class="py-5 text-[#b9c9bf]">暂无未结预占。</p><div v-for="item in summary.data.value.pending.data" :key="item.reference" class="grid gap-2 border-t border-white/10 py-4 md:grid-cols-[1fr_auto]"><div class="min-w-0"><b>{{ states[item.outcome] }}</b><code class="mt-2 block break-all text-[12px]">{{ item.requestId }}</code><p class="mb-0 text-[12px] text-[#b9c9bf]">{{ reasons[item.reviewReason ?? ''] ?? '处理完成后自动更新。' }} · {{ date(item.updatedAt) }}</p></div><div class="md:text-right"><span>预占 ¥ {{ item.reserved }}</span><span v-if="item.actual !== null" class="mt-1 block text-[#b9c9bf]">待结算 ¥ {{ item.actual }}</span></div></div></section>
    </template>
    <section class="console-surface overflow-hidden"><div class="p-5"><h2 class="m-0 text-[17px]">账户流水</h2><p class="mb-0 mt-2 leading-6 text-[#b9c9bf]">结算金额为实际费用；调用流水展示实际计费模型，可用额度的变动包含未用预占的返还。</p></div><div v-if="ledger.isPending.value" class="p-5" role="status">正在加载流水…</div><div v-else-if="ledger.isError.value" class="p-5" role="alert"><p>{{ ledger.error.value?.message }}</p><button class="console-secondary-action" @click="ledger.refetch()">重试</button></div><p v-else-if="!rows.length" class="p-5 text-[#b9c9bf]">暂无账户流水。</p><div v-else class="request-table console-data-table responsive-table"><table><thead><tr><th>业务 / 实际计费模型</th><th>事件金额</th><th>可用变动</th><th>冻结变动</th><th>发生时间</th></tr></thead><tbody><tr v-for="item in rows" :key="item.id"><td data-label="业务 / 实际计费模型"><div class="min-w-0 billing-ledger-business"><b>{{ kinds[item.kind] }}<template v-if="item.model"> · {{ item.model.name }}</template></b><span v-if="item.model" class="billing-ledger-model">{{ item.model.provider }} · <code>{{ item.model.publicId }}</code></span><span v-if="tokenUsage(item.inputTokens, item.outputTokens)" class="billing-ledger-meta">{{ tokenUsage(item.inputTokens, item.outputTokens) }}</span><span v-if="item.priceSnapshot" class="billing-ledger-meta">输入 ¥{{ item.priceSnapshot.inputPrice }} {{ priceUnit(item.priceSnapshot.priceUnit) }}<template v-if="item.priceSnapshot.outputPrice"> · 输出 ¥{{ item.priceSnapshot.outputPrice }} {{ priceUnit(item.priceSnapshot.priceUnit) }}</template></span><RouterLink v-if="item.requestId" class="billing-ledger-request" :to="{ path: '/console/logs', query: { requestId: item.requestId } }"><code>{{ item.requestId }}</code><span>查看调用</span></RouterLink><code v-else class="break-all">{{ item.reference }}</code></div></td><td data-label="事件金额">¥ {{ item.amount }}</td><td data-label="可用变动">{{ item.availableDelta }}</td><td data-label="冻结变动">{{ item.reservedDelta }}</td><td data-label="发生时间">{{ date(item.createdAt) }}</td></tr></tbody></table></div><div v-if="ledger.hasNextPage.value" class="flex justify-center p-4"><button class="console-secondary-action" :disabled="ledger.isFetchingNextPage.value" @click="ledger.fetchNextPage()">{{ ledger.isFetchingNextPage.value ? '加载中…' : '加载更多流水' }}</button></div></section>
    <p class="m-0 text-[12px] leading-6 text-[#b9c9bf]">在线充值、支付退款与发票尚未开放。如需核实额度，请提供请求 ID 联系平台管理员。</p>
  </div>
</template>

<style scoped>
.billing-ledger-business { display: grid; gap: 5px; min-width: 250px; }
.billing-ledger-model { color: #d9e8df; font-size: 12px; }
.billing-ledger-model code { display: inline; margin: 0; color: #8eeeb5; }
.billing-ledger-meta { color: #8fa39a; font-size: 12px; line-height: 1.5; }
.billing-ledger-request { display: flex; width: fit-content; max-width: 100%; align-items: center; gap: 8px; color: #8eeeb5; font-size: 12px; text-decoration: none; }
.billing-ledger-request code { overflow: hidden; max-width: 260px; text-overflow: ellipsis; white-space: nowrap; }
.billing-ledger-request span { white-space: nowrap; text-decoration: underline; text-underline-offset: 3px; }
.billing-ledger-request:hover { color: #b5f7cd; }
@media (max-width: 760px) {
  .responsive-table td:first-child { display: block; text-align: left; }
  .responsive-table td:first-child::before { display: block; margin-bottom: 10px; }
  .billing-ledger-business { width: 100%; min-width: 0; text-align: left; }
  .billing-ledger-model, .billing-ledger-meta { overflow-wrap: anywhere; }
  .billing-ledger-request { align-items: flex-start; flex-direction: column; gap: 3px; }
  .billing-ledger-request code { max-width: 100%; white-space: normal; overflow-wrap: anywhere; }
}
</style>
