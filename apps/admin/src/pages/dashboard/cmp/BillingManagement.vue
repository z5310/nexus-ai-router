<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { RefreshCw, X } from 'lucide-vue-next'
import type { BillingAdminGrantInput, BillingAdminResolutionInput, BillingResolutionPreview } from '@gateway/contracts'
import { authState } from '../../../lib/auth'
import { ApiError } from '../../../lib/http'
import { getBillingWorkspaces, getBillingDetail, getBillingLedger, grantBillingCredit, resolveBilling, previewBilling } from '../api/billing'

type Draft = { workspaceId: string; actorId: string; previewAmount: string } & ({ kind: 'grant'; input: BillingAdminGrantInput } | { kind: 'resolve'; reference: string; input: BillingAdminResolutionInput })
const client = useQueryClient()
const search = ref('')
const filter = ref('')
const page = ref(1)
const selected = ref('')
const workspaces = useQuery({ queryKey: computed(() => ['admin-billing-workspaces', filter.value, page.value]), queryFn: ({ signal }) => getBillingWorkspaces(filter.value, page.value, signal), retry: 1 })
const detail = useQuery({ queryKey: computed(() => ['admin-billing-detail', selected.value]), queryFn: ({ signal }) => getBillingDetail(selected.value, signal), enabled: computed(() => !!selected.value), retry: 1 })
const ledger = useInfiniteQuery({ queryKey: computed(() => ['admin-billing-ledger', selected.value]), initialPageParam: '', queryFn: ({ pageParam, signal }) => getBillingLedger(selected.value, pageParam || undefined, signal), getNextPageParam: (result) => result.nextCursor ?? undefined, enabled: computed(() => !!selected.value), retry: 1 })
const rows = computed(() => ledger.data.value?.pages.flatMap((item) => item.data) ?? [])
const dialog = ref<HTMLDialogElement | null>(null)
const kind = ref<'grant' | 'resolve'>('grant')
const reference = ref('')
const action = ref<'settle' | 'release'>('settle')
const amount = ref('')
const inputTokens = ref<number | string>('')
const outputTokens = ref<number | string>('')
const reason = ref('')
const evidence = ref('')
const operationId = ref(crypto.randomUUID())
const confirmed = ref(false)
const preview = ref<BillingResolutionPreview | null>(null)
const previewPending = ref(false)
const formError = ref('')
const receipt = ref('')
const saved = ref<Draft | null>(null)
const storageKey = computed(() => `nexus.billing.operation.${authState.user?.id}.${selected.value}`)
const rejected = computed(() => mutation.error.value instanceof ApiError && mutation.error.value.status >= 400 && mutation.error.value.status < 500)
const kinds: Record<string, string> = { grant: '额度入账', reserve: '预占', settle: '结算', release: '释放', manual_settle: '人工结算', manual_release: '人工释放' }
const states: Record<string, string> = { prepared: '准备调用', dispatched: '等待上游', settle: '等待自动结算', release: '等待自动释放', review: '待人工对账' }
const date = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false })

async function refresh() { await Promise.all([client.invalidateQueries({ queryKey: ['admin-billing-workspaces'] }), client.invalidateQueries({ queryKey: ['admin-billing-detail'] }), client.invalidateQueries({ queryKey: ['admin-billing-ledger'] })]) }
const mutation = useMutation({ mutationFn: (draft: Draft) => draft.kind === 'grant' ? grantBillingCredit(draft.workspaceId, draft.input) : resolveBilling(draft.workspaceId, draft.reference, draft.input), onSuccess: async (result, draft) => {
  receipt.value = `已完成操作 ${result.operationId}，可用额度 ¥ ${result.balance.available}`
  try { sessionStorage.removeItem(`nexus.billing.operation.${draft.actorId}.${draft.workspaceId}`) } catch { /* Replaying this receipt remains idempotent. */ }
  saved.value = null; dialog.value?.close(); await refresh()
} })
watch(selected, () => {
  dialog.value?.close(); receipt.value = ''; saved.value = null; mutation.reset()
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey.value) ?? 'null') as Draft | null
    if (value && value.workspaceId === selected.value && value.actorId === authState.user?.id && ['grant', 'resolve'].includes(value.kind)) saved.value = value
  } catch { /* A corrupt local draft cannot be submitted. */ }
})
watch([amount, reason, evidence, action, inputTokens, outputTokens], () => { confirmed.value = false; preview.value = null; operationId.value = crypto.randomUUID() })

async function open(mode: 'grant' | 'resolve', id = '') {
  kind.value = mode; reference.value = id; amount.value = ''; inputTokens.value = ''; outputTokens.value = ''; reason.value = ''; evidence.value = ''; action.value = 'settle'; formError.value = ''; mutation.reset(); confirmed.value = false
  await nextTick(); dialog.value?.showModal()
}
function close(event?: Event) { event?.preventDefault(); if (!mutation.isPending.value && !previewPending.value) dialog.value?.close() }
function clearRejected() {
  if (!rejected.value) return
  sessionStorage.removeItem(storageKey.value); saved.value = null; mutation.reset(); dialog.value?.close()
}
function token(value: number | string) { return value !== '' && Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 2147483647 }
async function review() {
  formError.value = ''
  if (reason.value.trim().length < 5 || evidence.value.trim().length < 3) { formError.value = '请填写至少 5 字原因和 3 字核实依据。'; return }
  if (kind.value === 'grant') {
    if (!/^\d{1,12}(\.\d{1,6})?$/.test(amount.value) || !/[1-9]/.test(amount.value)) { formError.value = '请输入大于零的额度，最多六位小数。'; return }
    confirmed.value = true; return
  }
  if (action.value === 'settle' && (!token(inputTokens.value) || !token(outputTokens.value))) { formError.value = '请输入已核实的非负整数 Token 用量。'; return }
  previewPending.value = true
  try { preview.value = await previewBilling(selected.value, reference.value, { action: action.value, ...(action.value === 'settle' ? { inputTokens: Number(inputTokens.value), outputTokens: Number(outputTokens.value) } : {}) }); confirmed.value = true }
  catch (error) { formError.value = error instanceof Error ? error.message : '核对失败' }
  finally { previewPending.value = false }
}
function submit() {
  const common = { operationId: operationId.value, reason: reason.value.trim(), evidence: evidence.value.trim() }
  const context = { workspaceId: selected.value, actorId: authState.user!.id, previewAmount: kind.value === 'grant' ? amount.value : preview.value!.amount }
  const draft: Draft = kind.value === 'grant' ? { ...context, kind: 'grant', input: { ...common, amount: amount.value } } : { ...context, kind: 'resolve', reference: reference.value, input: { ...common, action: action.value, ...(action.value === 'settle' ? { inputTokens: Number(inputTokens.value), outputTokens: Number(outputTokens.value) } : {}) } }
  try { sessionStorage.setItem(storageKey.value, JSON.stringify(draft)); saved.value = draft }
  catch { formError.value = '无法保留操作编号，请允许会话存储后重试。'; return }
  mutation.mutate(draft)
}
</script>

<template>
  <div class="billing-management grid gap-5 text-[14px] text-white">
    <section class="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><form class="flex flex-wrap items-end gap-3" @submit.prevent="filter = search; page = 1"><label class="grid min-w-0 flex-1 gap-2">查找工作区<input v-model="search" maxlength="80" class="min-h-11 rounded-lg border border-white/15 bg-transparent px-3" placeholder="工作区名称或标识" /></label><button class="min-h-11 rounded-lg border border-white/20 px-4">搜索</button><button type="button" class="flex min-h-11 items-center gap-2 rounded-lg border border-white/20 px-4" @click="refresh"><RefreshCw :size="16" />刷新</button></form><p v-if="workspaces.isPending.value" role="status">正在加载工作区…</p><p v-else-if="workspaces.isError.value" role="alert">{{ workspaces.error.value?.message }} <button type="button" @click="workspaces.refetch()">重试</button></p><template v-else><label class="mt-4 grid gap-2">当前工作区<select v-model="selected" :disabled="mutation.isPending.value" class="min-h-11 w-full rounded-lg border border-white/15 bg-[#101d16] px-3"><option value="">请选择工作区</option><option v-for="workspace in workspaces.data.value?.data" :key="workspace.id" :value="workspace.id">{{ workspace.name }} · {{ workspace.slug }}</option></select></label><p v-if="!workspaces.data.value?.data.length">没有匹配的工作区。</p><div class="mt-3 flex items-center justify-between gap-2 text-[12px]"><span>共 {{ workspaces.data.value?.total ?? 0 }} 个工作区 · 第 {{ page }} 页</span><div class="flex gap-3"><button :disabled="page <= 1 || mutation.isPending.value" @click="page--">上一页</button><button :disabled="page * 20 >= (workspaces.data.value?.total ?? 0) || mutation.isPending.value" @click="page++">下一页</button></div></div></template></section>
    <p v-if="receipt" class="break-all rounded-xl border border-[#63e495]/30 p-4 text-[#9deab6]" role="status">{{ receipt }}</p>
    <section v-if="saved" class="rounded-xl border border-amber-300/30 p-5"><h2 class="m-0 text-[16px]">上次提交的结果需要核实</h2><p>操作编号：<code class="break-all">{{ saved.input.operationId }}</code></p><p>{{ saved.kind === 'grant' ? '额度授予' : saved.input.action === 'settle' ? '人工结算' : '人工释放' }} · ¥ {{ saved.previewAmount }} · {{ saved.input.reason }}</p><p class="text-[12px] leading-6 text-[#bccbc1]">重试会使用原操作编号及原内容。核实完成前不能发起新操作。</p><button class="min-h-11 rounded-lg border border-white/25 px-4" :disabled="mutation.isPending.value" @click="mutation.mutate(saved)">重试并核实结果</button><button v-if="rejected" class="ml-3 min-h-11 rounded-lg border border-white/25 px-4" @click="clearRejected">已确认被拒绝，结束本次提交</button></section>
    <p v-if="mutation.isError.value" role="alert" class="break-words text-[#ffb5a9]">{{ mutation.error.value?.message }}</p>
    <p v-if="selected && detail.isPending.value" role="status">正在读取账户…</p><div v-else-if="detail.isError.value" role="alert">{{ detail.error.value?.message }} <button @click="detail.refetch()">重试</button></div>
    <template v-else-if="detail.data.value">
      <section class="grid gap-3 rounded-2xl border border-white/10 p-5 md:grid-cols-3"><div><span class="text-[#bccbc1]">可用额度 · CNY</span><strong class="mt-2 block break-all text-[25px]">¥ {{ detail.data.value.workspace.balance.available }}</strong></div><div><span class="text-[#bccbc1]">冻结额度</span><strong class="mt-2 block break-all text-[25px]">¥ {{ detail.data.value.workspace.balance.reserved }}</strong></div><div><span>Chat {{ detail.data.value.workspace.chatEnabled ? '自动计费已启用' : '自动计费未启用' }}</span><button class="billing-primary mt-3 block min-h-11 rounded-lg bg-white px-5 font-semibold text-[#08130d] disabled:opacity-40" :disabled="!!saved || mutation.isPending.value" @click="open('grant')">授予工作区额度</button></div><p class="m-0 text-[12px] leading-6 text-[#bccbc1] md:col-span-3">额度授予不代表支付到账，不改变计费启用配置。所有操作保留操作者、原因、核实依据及前后状态。</p></section>
      <section class="rounded-2xl border border-white/10 p-5"><h2 class="m-0 text-[17px]">未结预占（最早 50 条）</h2><p v-if="!detail.data.value.pending.data.length" class="py-4 text-[#bccbc1]">暂无未结预占。</p><article v-for="item in detail.data.value.pending.data" :key="item.reference" class="mt-4 grid gap-3 border-t border-white/10 pt-4 md:grid-cols-[1fr_auto]"><div class="min-w-0"><b>{{ states[item.outcome] }}</b><code class="mt-2 block break-all text-[12px]">{{ item.reference }}</code><p class="text-[#bccbc1]">预占 ¥ {{ item.reserved }}<span v-if="item.actual !== null"> · 待结算 ¥ {{ item.actual }}</span></p><p class="m-0 text-[12px] text-[#bccbc1]">{{ item.reviewReason || '等待处理' }} · {{ date(item.updatedAt) }}</p></div><button v-if="item.outcome === 'review'" class="min-h-11 self-center rounded-lg border border-white/25 px-4 disabled:opacity-40" :disabled="!!saved || mutation.isPending.value" @click="open('resolve', item.reference)">核实并处置</button></article></section>
      <section class="rounded-2xl border border-white/10 p-5"><h2 class="m-0 text-[17px]">账户流水</h2><p v-if="ledger.isPending.value">正在读取流水…</p><p v-else-if="ledger.isError.value" role="alert">{{ ledger.error.value?.message }} <button @click="ledger.refetch()">重试</button></p><p v-else-if="!rows.length" class="py-4 text-[#bccbc1]">暂无流水。</p><article v-for="item in rows" :key="item.id" class="mt-3 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-3"><div class="min-w-0"><b>{{ kinds[item.kind] }} · ¥ {{ item.amount }}</b><code class="mt-1 block break-all text-[12px] text-[#bccbc1]">{{ item.reference }}</code></div><div class="text-[12px] leading-6 text-[#bccbc1]">可用变动 {{ item.availableDelta }} · 冻结变动 {{ item.reservedDelta }}<br />{{ date(item.createdAt) }}</div></article><button v-if="ledger.hasNextPage.value" class="mt-4 min-h-11 rounded-lg border border-white/20 px-4" :disabled="ledger.isFetchingNextPage.value" @click="ledger.fetchNextPage()">加载更多流水</button></section>
      <section class="rounded-2xl border border-white/10 p-5"><h2 class="m-0 text-[17px]">财务操作审计（最近 50 条）</h2><p v-if="!detail.data.value.audit.length" class="py-4 text-[#bccbc1]">暂无财务管理操作。</p><article v-for="item in detail.data.value.audit" :key="item.operationId" class="mt-4 border-t border-white/10 pt-4"><b>{{ kinds[item.kind] }} · {{ item.actorName }}</b><p class="break-words">{{ item.reason }}</p><p class="break-words text-[#bccbc1]">核实依据：{{ item.evidence }}</p><code class="block break-all text-[12px]">{{ item.operationId }}</code><p class="mb-0 text-[12px] text-[#bccbc1]">可用 ¥ {{ item.beforeBalance.available }} → ¥ {{ item.result.balance.available }} · 冻结 ¥ {{ item.beforeBalance.reserved }} → ¥ {{ item.result.balance.reserved }} · {{ date(item.createdAt) }}</p></article></section>
    </template>
    <dialog ref="dialog" class="billing-dialog max-h-[90dvh] overflow-y-auto rounded-2xl border border-white/20 bg-[#0e1b13] p-0 text-white shadow-2xl backdrop:bg-black/70" aria-labelledby="billing-dialog-title" @cancel="close">
      <div class="flex items-center justify-between border-b border-white/10 p-5"><h2 id="billing-dialog-title" class="m-0 text-[19px]">{{ kind === 'grant' ? '授予额度' : '人工对账' }}</h2><button class="h-11 w-11" aria-label="关闭财务操作" :disabled="mutation.isPending.value || previewPending" @click="close()"><X :size="20" /></button></div>
      <form class="grid gap-4 p-5 text-[14px]" @submit.prevent="confirmed ? submit() : review()"><p class="m-0 break-all text-[#bccbc1]">{{ detail.data.value?.workspace.name }} · {{ selected }}</p><fieldset :disabled="confirmed || mutation.isPending.value || previewPending" class="m-0 grid min-w-0 gap-4 border-0 p-0"><label v-if="kind === 'grant'" class="grid gap-2">额度金额（CNY）<input v-model="amount" inputmode="decimal" required class="min-h-11 rounded-lg border border-white/20 bg-transparent px-3" placeholder="例如 10.000000" /></label><template v-else><code class="break-all text-[12px]">{{ reference }}</code><label class="grid gap-2">处置方式<select v-model="action" class="min-h-11 rounded-lg border border-white/20 bg-[#102117] px-3"><option value="settle">按已核实用量结算</option><option value="release">确认无费用，释放预占</option></select></label><div v-if="action === 'settle'" class="grid grid-cols-2 gap-3"><label class="grid gap-2">输入 Tokens<input v-model="inputTokens" inputmode="numeric" required class="min-h-11 min-w-0 rounded-lg border border-white/20 bg-transparent px-3" /></label><label class="grid gap-2">输出 Tokens<input v-model="outputTokens" inputmode="numeric" required class="min-h-11 min-w-0 rounded-lg border border-white/20 bg-transparent px-3" /></label></div></template><label class="grid gap-2">操作原因<textarea v-model="reason" minlength="5" maxlength="500" required rows="3" class="rounded-lg border border-white/20 bg-transparent p-3" placeholder="说明授予额度或核实处置的原因" /></label><label class="grid gap-2">核实依据<input v-model="evidence" minlength="3" maxlength="200" required class="min-h-11 rounded-lg border border-white/20 bg-transparent px-3" placeholder="工单编号、供应商结果编号等，不填密钥或完整提示词" /></label></fieldset><p v-if="formError" role="alert" class="m-0 text-[#ffb5a9]">{{ formError }}</p><p v-if="mutation.isError.value" role="alert" class="m-0 text-[#ffb5a9]">{{ mutation.error.value?.message }}。可关闭后使用原编号核实结果。</p><section v-if="confirmed" class="rounded-xl border border-[#63e495]/30 p-4"><b>请核对后确认</b><p>{{ kind === 'grant' ? '授予额度' : action === 'settle' ? '实际结算费用' : '确认费用' }}：¥ {{ kind === 'grant' ? amount : preview?.amount }}</p><template v-if="preview"><p>原预占 ¥ {{ preview.reserved }} · 操作后可用 ¥ {{ preview.availableAfter }}</p><p v-if="!preview.sufficient" class="text-[#ffb5a9]">可用额度不足，不能执行此结算。</p></template><p class="mb-0 text-[12px] leading-6 text-[#bccbc1]">提交后立即记入不可变流水与审计，不能直接删除或修改。</p></section><div class="flex flex-wrap justify-end gap-3"><button v-if="confirmed && !saved" type="button" class="min-h-11 rounded-lg border border-white/20 px-4" @click="confirmed = false">返回修改</button><button class="billing-primary min-h-11 rounded-lg bg-[#63e495] px-5 font-semibold text-[#07140c] disabled:opacity-40" :disabled="mutation.isPending.value || previewPending || (!!preview && !preview.sufficient) || !!saved">{{ mutation.isPending.value ? '提交中…' : previewPending ? '核对中…' : confirmed ? '确认并提交' : '核对操作' }}</button></div></form>
    </dialog>
  </div>
</template>

<style scoped>
.billing-management :is(input, select, textarea, button) { color: #fff; font: inherit; }
.billing-management :is(input, select, textarea) { min-width: 0; width: 100%; box-sizing: border-box; }
.billing-management button { background: transparent; cursor: pointer; }
.billing-management button:disabled { opacity: .45; cursor: default; }
.billing-management button.billing-primary { background: #63e495; color: #07140c; }
.billing-dialog { width: min(560px, calc(100% - 24px)); }
</style>
