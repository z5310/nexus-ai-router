<script setup lang="ts">
import { computed, defineAsyncComponent, reactive, ref, watch } from 'vue'
import { useInfiniteQuery, useQuery } from '@tanstack/vue-query'
import { CalendarDays, RefreshCw } from 'lucide-vue-next'
import { activeWorkspaceId, workspaceQueryKey } from '../../../stores/workspace'
import { getBillingLedger, getBillingSummary, getBillingUsage, type BillingPeriod } from '../api/billing'

const BillingUsageChart = defineAsyncComponent(() => import('./BillingUsageChart.vue'))

const enabled = computed(() => Boolean(activeWorkspaceId.value))
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const today = localDate(new Date())
const dates = reactive({ from: today, to: today })
const preset = ref<'today' | '7d' | '30d' | 'custom'>('today')
const period = computed<BillingPeriod>(() => {
  const from = new Date(`${dates.from}T00:00:00`)
  const to = new Date(`${dates.to}T00:00:00`)
  to.setDate(to.getDate() + 1)
  return { from: from.toISOString(), to: to.toISOString() }
})
const periodLabel = computed(() => dates.from === dates.to ? dates.from : `${dates.from} 至 ${dates.to}`)
const summary = useQuery({ queryKey: computed(() => workspaceQueryKey('billing-summary')), queryFn: ({ signal }) => getBillingSummary(signal), enabled, refetchInterval: 30000, retry: 1 })
const usage = useQuery({ queryKey: computed(() => workspaceQueryKey(`billing-usage:${period.value.from}:${period.value.to}`)), queryFn: ({ signal }) => getBillingUsage(period.value, signal), enabled, retry: 1 })
const ledger = useInfiniteQuery({ queryKey: computed(() => workspaceQueryKey(`billing-ledger:${period.value.from}:${period.value.to}`)), initialPageParam: '', queryFn: ({ pageParam, signal }) => getBillingLedger(period.value, pageParam || undefined, signal), getNextPageParam: (page) => page.nextCursor ?? undefined, enabled, retry: 1 })
const rows = computed(() => ledger.data.value?.pages.flatMap((page) => page.data) ?? [])
const totalTokens = computed(() => (usage.data.value?.totals.inputTokens ?? 0) + (usage.data.value?.totals.outputTokens ?? 0))
const kinds = { grant: '额度入账', reserve: '调用预占', settle: '用量结算', release: '预占释放' }
const states: Record<string, string> = { prepared: '准备调用', dispatched: '等待上游结果', settle: '等待结算', release: '等待释放', review: '待人工对账' }
const reasons: Record<string, string> = { upstream_usage_unknown: '上游用量尚未确认', process_outcome_unknown: '调用结果需要核实', settlement_funds_insufficient: '可用额度不足，等待补足', settlement_retry_pending: '结算等待恢复处理' }
const date = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false })
const tokenUsage = (input: number | null, output: number | null) => input === null || output === null ? '' : `${input.toLocaleString()} 输入 · ${output.toLocaleString()} 输出 Tokens`
const priceUnit = (value: string | undefined) => ({ million_tokens: '/ 1M Tokens', image: '/ 张', second: '/ 秒', '10k_chars': '/ 万字符' }[value ?? ''] ?? '')
const money = (value: string | undefined) => Number(value ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 6, maximumFractionDigits: 6 })

function selectPreset(next: 'today' | '7d' | '30d') {
  preset.value = next
  const end = new Date()
  const start = new Date()
  if (next === '7d') start.setDate(start.getDate() - 6)
  if (next === '30d') start.setDate(start.getDate() - 29)
  dates.from = localDate(start)
  dates.to = localDate(end)
}
function changeDate() {
  preset.value = 'custom'
  if (dates.from > dates.to) dates.to = dates.from
}
function refresh() { void Promise.all([summary.refetch(), usage.refetch(), ledger.refetch()]) }
watch(() => dates.to, () => { if (dates.to < dates.from) dates.from = dates.to })
</script>

<template>
  <div class="grid gap-5 text-[14px] text-white">
    <section class="billing-filter console-surface" aria-label="账单时间筛选">
      <div class="billing-filter-title"><CalendarDays :size="17" /><span>统计时间</span><b>{{ periodLabel }}</b></div>
      <div class="billing-presets" aria-label="快捷时间范围">
        <button v-for="item in [{ key: 'today', label: '今日' }, { key: '7d', label: '近 7 日' }, { key: '30d', label: '近 30 日' }]" :key="item.key" type="button" :class="{ active: preset === item.key }" @click="selectPreset(item.key as 'today' | '7d' | '30d')">{{ item.label }}</button>
      </div>
      <div class="billing-dates">
        <label><span>开始</span><input v-model="dates.from" type="date" :max="today" @change="changeDate"></label>
        <span aria-hidden="true">—</span>
        <label><span>结束</span><input v-model="dates.to" type="date" :min="dates.from" :max="today" @change="changeDate"></label>
      </div>
      <button class="console-secondary-action" :disabled="summary.isFetching.value || usage.isFetching.value || ledger.isFetching.value" @click="refresh"><RefreshCw :size="16" />刷新</button>
    </section>

    <div v-if="summary.isPending.value" class="console-state" role="status">正在读取账户额度…</div>
    <div v-else-if="summary.isError.value" class="console-state error" role="alert"><span>{{ summary.error.value?.message || '账户读取失败' }}</span><button class="console-secondary-action" @click="summary.refetch()">重试</button></div>
    <template v-else-if="summary.data.value">
      <div class="billing-metrics">
        <article class="console-surface"><p>可用余额</p><strong>¥ {{ money(summary.data.value.balance.available) }}</strong><span>当前账户余额</span></article>
        <article class="console-surface"><p>冻结金额</p><strong>¥ {{ money(summary.data.value.balance.reserved) }}</strong><span>预占尚未结清，不计入消费</span></article>
        <article class="console-surface"><p>消费金额</p><strong v-if="usage.data.value">¥ {{ money(usage.data.value.totals.spent) }}</strong><strong v-else>—</strong><span>所选时段 · 已结算</span></article>
        <article class="console-surface"><p>API 请求 / Tokens</p><strong v-if="usage.data.value">{{ usage.data.value.totals.requests.toLocaleString() }} <small>次</small></strong><strong v-else>—</strong><span>{{ totalTokens.toLocaleString() }} Tokens</span></article>
      </div>
      <div class="billing-status"><span :class="{ enabled: summary.data.value.status.chatEnabled }">{{ summary.data.value.status.chatEnabled ? 'Chat 自动计费已启用' : 'Chat 自动计费未启用' }}</span><p>{{ summary.data.value.status.chatEnabled ? '调用前预占，按供应商确认用量结算。' : '当前工作区不会自动扣费，已有额度与历史流水仍可查看。' }}</p></div>
    </template>

    <section class="console-surface billing-analysis">
      <div class="billing-section-heading"><div><p>消费趋势</p><h2>{{ periodLabel }} 的已结算消费</h2></div><span>按实际计费模型</span></div>
      <div v-if="usage.isPending.value" class="console-state" role="status">正在统计消费数据…</div>
      <div v-else-if="usage.isError.value" class="console-state error" role="alert"><span>{{ usage.error.value?.message || '消费统计读取失败' }}</span><button class="console-secondary-action" @click="usage.refetch()">重试</button></div>
      <template v-else-if="usage.data.value">
        <BillingUsageChart :report="usage.data.value" />
        <div class="billing-models">
          <div class="billing-models-title"><b>模型消费明细</b><span>结算金额 / 请求 / Tokens</span></div>
          <p v-if="!usage.data.value.models.length" class="m-0 py-5 text-[#82958b]">所选时段暂无模型消费。</p>
          <div v-for="(model, index) in usage.data.value.models" :key="model.id" class="billing-model-row">
            <span class="billing-model-rank">{{ index + 1 }}</span>
            <div><b>{{ model.name }}</b><span>{{ model.provider }} · {{ model.publicId }}</span></div>
            <div><b>¥ {{ money(model.spent) }}</b><span>{{ model.requests.toLocaleString() }} 次 · {{ (model.inputTokens + model.outputTokens).toLocaleString() }} Tokens</span></div>
          </div>
        </div>
      </template>
    </section>

    <section v-if="summary.data.value" class="console-surface p-5"><h2 class="m-0 text-[17px]">未结预占</h2><p class="mt-2 leading-6 text-[#b9c9bf]">用量未知的调用会保留额度，由平台核实后结算或释放。显示最早的 50 条。</p><p v-if="!summary.data.value.pending.data.length" class="py-5 text-[#b9c9bf]">暂无未结预占。</p><div v-for="item in summary.data.value.pending.data" :key="item.reference" class="grid gap-2 border-t border-white/10 py-4 md:grid-cols-[1fr_auto]"><div class="min-w-0"><b>{{ states[item.outcome] }}</b><code class="mt-2 block break-all text-[12px]">{{ item.requestId }}</code><p class="mb-0 text-[12px] text-[#b9c9bf]">{{ reasons[item.reviewReason ?? ''] ?? '处理完成后自动更新。' }} · {{ date(item.updatedAt) }}</p></div><div class="md:text-right"><span>预占 ¥ {{ item.reserved }}</span><span v-if="item.actual !== null" class="mt-1 block text-[#b9c9bf]">待结算 ¥ {{ item.actual }}</span></div></div></section>

    <section class="console-surface overflow-hidden"><div class="billing-section-heading p-5"><div><p>账户流水</p><h2>{{ periodLabel }}</h2></div><span>共 {{ rows.length }} 条已加载</span></div><p class="mx-5 mb-4 mt-0 leading-6 text-[#b9c9bf]">时间筛选同时作用于流水；结算金额为实际费用，可用额度变动包含未用预占的返还。</p><div v-if="ledger.isPending.value" class="p-5" role="status">正在加载流水…</div><div v-else-if="ledger.isError.value" class="p-5" role="alert"><p>{{ ledger.error.value?.message }}</p><button class="console-secondary-action" @click="ledger.refetch()">重试</button></div><p v-else-if="!rows.length" class="p-5 text-[#b9c9bf]">所选时段暂无账户流水。</p><div v-else class="request-table console-data-table responsive-table"><table><thead><tr><th>业务 / 实际计费模型</th><th>事件金额</th><th>可用变动</th><th>冻结变动</th><th>发生时间</th></tr></thead><tbody><tr v-for="item in rows" :key="item.id"><td data-label="业务 / 实际计费模型"><div class="min-w-0 billing-ledger-business"><b>{{ kinds[item.kind] }}<template v-if="item.model"> · {{ item.model.name }}</template></b><span v-if="item.model" class="billing-ledger-model">{{ item.model.provider }} · <code>{{ item.model.publicId }}</code></span><span v-if="tokenUsage(item.inputTokens, item.outputTokens)" class="billing-ledger-meta">{{ tokenUsage(item.inputTokens, item.outputTokens) }}</span><span v-if="item.priceSnapshot" class="billing-ledger-meta">输入 ¥{{ item.priceSnapshot.inputPrice }} {{ priceUnit(item.priceSnapshot.priceUnit) }}<template v-if="item.priceSnapshot.outputPrice"> · 输出 ¥{{ item.priceSnapshot.outputPrice }} {{ priceUnit(item.priceSnapshot.priceUnit) }}</template></span><RouterLink v-if="item.requestId" class="billing-ledger-request" :to="{ path: '/console/logs', query: { requestId: item.requestId } }"><code>{{ item.requestId }}</code><span>查看调用</span></RouterLink><code v-else class="break-all">{{ item.reference }}</code></div></td><td data-label="事件金额">¥ {{ item.amount }}</td><td data-label="可用变动">{{ item.availableDelta }}</td><td data-label="冻结变动">{{ item.reservedDelta }}</td><td data-label="发生时间">{{ date(item.createdAt) }}</td></tr></tbody></table></div><div v-if="ledger.hasNextPage.value" class="flex justify-center p-4"><button class="console-secondary-action" :disabled="ledger.isFetchingNextPage.value" @click="ledger.fetchNextPage()">{{ ledger.isFetchingNextPage.value ? '加载中…' : '加载更多流水' }}</button></div></section>
    <p class="m-0 text-[12px] leading-6 text-[#b9c9bf]">统计按结算发生时间归集。在线充值、支付退款与发票尚未开放；如需核实额度，请提供请求 ID 联系平台管理员。</p>
  </div>
</template>

<style scoped>
.billing-filter { display: flex; align-items: center; gap: 14px; padding: 12px 14px; }
.billing-filter-title { display: flex; align-items: center; gap: 8px; color: #8fa39a; }
.billing-filter-title b { color: #effbf3; font-weight: 600; }
.billing-presets { display: flex; padding: 3px; border: 1px solid rgba(168, 201, 182, .14); border-radius: 10px; background: rgba(3, 13, 8, .35); }
.billing-presets button { border: 0; border-radius: 7px; padding: 7px 11px; background: transparent; color: #8fa39a; cursor: pointer; font: inherit; }
.billing-presets button.active { background: #5fe497; color: #092016; font-weight: 700; }
.billing-dates { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.billing-dates label { display: flex; align-items: center; gap: 7px; color: #8fa39a; font-size: 12px; }
.billing-dates input { min-height: 34px; border: 1px solid rgba(168, 201, 182, .2); border-radius: 8px; padding: 0 9px; background: #0b1711; color: #effbf3; color-scheme: dark; font: inherit; }
.billing-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.billing-metrics article { min-height: 142px; padding: 20px; }
.billing-metrics p { margin: 0; color: #9caf9f; }
.billing-metrics strong { display: block; margin-top: 16px; overflow-wrap: anywhere; font-size: clamp(20px, 2vw, 28px); line-height: 1.1; }
.billing-metrics strong small { font-size: 13px; color: #9caf9f; }
.billing-metrics article > span { display: block; margin-top: 10px; color: #758a7f; font-size: 12px; line-height: 1.5; }
.billing-status { display: flex; align-items: center; gap: 12px; margin-top: -6px; color: #8fa39a; font-size: 12px; }
.billing-status > span { border: 1px solid rgba(168, 201, 182, .18); border-radius: 999px; padding: 5px 10px; color: #a8b9af; }
.billing-status > span.enabled { border-color: rgba(95, 228, 151, .3); background: rgba(95, 228, 151, .08); color: #72eda7; }
.billing-status p { margin: 0; }
.billing-analysis { overflow: hidden; padding: 20px; }
.billing-section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.billing-section-heading p { margin: 0 0 5px; color: #70eaa5; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.billing-section-heading h2 { margin: 0; font-size: 18px; }
.billing-section-heading > span { border: 1px solid rgba(168, 201, 182, .16); border-radius: 999px; padding: 5px 9px; color: #91a59a; font-size: 12px; }
.billing-models { margin-top: 10px; border-top: 1px solid rgba(168, 201, 182, .12); }
.billing-models-title, .billing-model-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px; }
.billing-models-title { padding: 16px 0 9px; color: #8fa39a; font-size: 12px; }
.billing-models-title b { color: #e7f6ec; font-size: 14px; }
.billing-model-row { grid-template-columns: 26px minmax(0, 1fr) auto; border-top: 1px solid rgba(168, 201, 182, .09); padding: 13px 0; }
.billing-model-rank { display: grid; width: 24px; height: 24px; place-items: center; border-radius: 7px; background: rgba(95, 228, 151, .1); color: #72eda7; font-size: 11px; font-weight: 700; }
.billing-model-row > div { display: grid; gap: 4px; min-width: 0; }
.billing-model-row > div:last-child { text-align: right; }
.billing-model-row span { overflow-wrap: anywhere; color: #82958b; font-size: 12px; }
.billing-ledger-business { display: grid; gap: 5px; min-width: 250px; }
.billing-ledger-model { color: #d9e8df; font-size: 12px; }
.billing-ledger-model code { display: inline; margin: 0; color: #8eeeb5; }
.billing-ledger-meta { color: #8fa39a; font-size: 12px; line-height: 1.5; }
.billing-ledger-request { display: flex; width: fit-content; max-width: 100%; align-items: center; gap: 8px; color: #8eeeb5; font-size: 12px; text-decoration: none; }
.billing-ledger-request code { overflow: hidden; max-width: 260px; text-overflow: ellipsis; white-space: nowrap; }
.billing-ledger-request span { white-space: nowrap; text-decoration: underline; text-underline-offset: 3px; }
.billing-ledger-request:hover { color: #b5f7cd; }
@media (max-width: 1000px) {
  .billing-filter { align-items: flex-start; flex-wrap: wrap; }
  .billing-dates { width: 100%; margin-left: 0; }
  .billing-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .billing-filter-title { width: 100%; flex-wrap: wrap; }
  .billing-presets { width: 100%; }
  .billing-presets button { flex: 1; }
  .billing-dates { align-items: stretch; flex-direction: column; }
  .billing-dates > span { display: none; }
  .billing-dates label { justify-content: space-between; }
  .billing-dates input { width: 70%; }
  .billing-filter > .console-secondary-action { width: 100%; }
  .billing-metrics { grid-template-columns: 1fr; }
  .billing-metrics article { min-height: 0; }
  .billing-status { align-items: flex-start; flex-direction: column; }
  .billing-model-row { align-items: start; grid-template-columns: 24px minmax(0, 1fr); }
  .billing-model-row > div:last-child { grid-column: 2; text-align: left; }
  .responsive-table td:first-child { display: block; text-align: left; }
  .responsive-table td:first-child::before { display: block; margin-bottom: 10px; }
  .billing-ledger-business { width: 100%; min-width: 0; text-align: left; }
  .billing-ledger-model, .billing-ledger-meta { overflow-wrap: anywhere; }
  .billing-ledger-request { align-items: flex-start; flex-direction: column; gap: 3px; }
  .billing-ledger-request code { max-width: 100%; white-space: normal; overflow-wrap: anywhere; }
}
</style>
