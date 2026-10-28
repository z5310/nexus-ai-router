<script setup lang="ts">
import AButton from 'ant-design-vue/es/button'
import AInput from 'ant-design-vue/es/input'
import ASelect, { SelectOption as ASelectOption } from 'ant-design-vue/es/select'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { Check, Circle, Clipboard, KeyRound, LoaderCircle, Rocket, Terminal } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import type { OpenAIChatCompletionResponse } from '@gateway/contracts'
import { feedback } from '@gateway/ui'
import ConsoleShell from './cmp/ConsoleShell.vue'
import { createApiKey, getApiKeys, getConsoleModels } from './api'
import { workspaceQueryKey } from '../../stores/workspace'

const queryClient = useQueryClient()
const modelQuery = useQuery({ queryKey: computed(() => workspaceQueryKey('console-models')), queryFn: ({ signal }) => getConsoleModels(signal), retry: 1 })
const keyQuery = useQuery({ queryKey: computed(() => workspaceQueryKey('api-keys')), queryFn: ({ signal }) => getApiKeys(signal), retry: 1 })
const textModels = computed(() => (modelQuery.data.value?.data ?? []).filter((item) => item.enabled && item.type === 'text'))
const selectedModel = ref('')
const modelId = computed(() => selectedModel.value || textModels.value[0]?.slug || '')
const keyName = ref('首次调用验收')
const secret = ref('')
const copied = ref(false)
const result = ref<{ requestId: string; content: string; tokens: number } | null>(null)
const callError = ref('')
const hasKey = computed(() => Boolean(secret.value || keyQuery.data.value?.data.some((item) => item.status === 'active')))
const apiOrigin = new URL(import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin), window.location.origin).origin
const sample = computed(() => `curl "${apiOrigin}/v1/chat/completions" \\
  -H "Authorization: Bearer $NEXUS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: first-call-$(date +%s)" \\
  -d '${JSON.stringify({ model: modelId.value || 'deepseek/deepseek-v4.1-flash', messages: [{ role: 'user', content: '只回复：连接成功' }], max_tokens: 64, stream: false })}'`)

const createKeyMutation = useMutation({
  mutationFn: () => createApiKey({ name: keyName.value.trim() }),
  onSuccess: async (created) => {
    secret.value = created.key
    result.value = null
    feedback.success('验收密钥已创建', '密钥只保留在当前页面内存中，关闭页面后无法再次查看。')
    await queryClient.invalidateQueries({ queryKey: workspaceQueryKey('api-keys') })
  },
  onError: (error) => feedback.error(error, '验收密钥创建失败'),
})

const callMutation = useMutation({
  mutationFn: async () => {
    if (!secret.value) throw new Error('请先在本页创建一把验收密钥')
    if (!modelId.value) throw new Error('请先为工作区启用一个文本模型')
    const response = await fetch(`${apiOrigin}/v1/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${secret.value}`, 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
      body: JSON.stringify({ model: modelId.value, messages: [{ role: 'user', content: '只回复：连接成功' }], temperature: 0, max_tokens: 64, stream: false }),
    })
    const payload = await response.json().catch(() => ({})) as OpenAIChatCompletionResponse & { detail?: string; error?: { message?: string }; request_id?: string }
    if (!response.ok) throw new Error(payload.error?.message || payload.detail || `调用失败 (${response.status})`)
    return { requestId: response.headers.get('x-request-id') || payload.id, content: payload.choices[0]?.message.content || '', tokens: payload.usage.total_tokens }
  },
  onMutate: () => { callError.value = ''; result.value = null },
  onSuccess: (value) => { result.value = value; feedback.success('首次 API 调用成功', `请求 ${value.requestId} 已进入调用日志。`) },
  onError: (error) => { callError.value = error instanceof Error ? error.message : '调用失败'; feedback.error(error, '首次调用未通过') },
})

async function copy(value: string) { await navigator.clipboard.writeText(value); copied.value = true; setTimeout(() => { copied.value = false }, 1500) }
</script>

<template>
  <ConsoleShell>
    <div class="console-title"><div><p>FIRST CALL</p><h1>完成首次 API 调用</h1><span>启用模型、创建一次性可见的密钥，并用真实供应商链路发送一条低 Token 请求。</span></div></div>
    <section class="mt-3.5 grid gap-3 lg:grid-cols-3">
      <article v-for="(step, index) in [{ title: '启用文本模型', done: textModels.length > 0 }, { title: '创建 API Key', done: hasKey }, { title: '调用成功', done: Boolean(result) }]" :key="step.title" class="console-surface !m-0 flex items-center gap-3">
        <span class="h-8 w-8 grid place-items-center rounded-full bg-white/5 text-[#8ce5aa]"><Check v-if="step.done" :size="17" /><Circle v-else :size="17" /></span><div><small class="text-[#66756c]">步骤 {{ index + 1 }}</small><b class="mt-1 block text-[13px] text-white">{{ step.title }}</b></div>
      </article>
    </section>
    <section class="console-surface grid gap-5">
      <header class="flex items-start justify-between gap-4"><div><h2 class="m-0 text-[15px]">1. 选择工作区模型</h2><p class="mb-0 mt-1 text-[12px] text-[#718077]">这里只列出已启用的文本模型，调用会走真实路由和供应商部署。</p></div><RouterLink class="console-secondary-action" to="/console/models">管理模型</RouterLink></header>
      <div v-if="modelQuery.isLoading.value" class="text-[12px] text-[#718077]">正在读取模型…</div><div v-else-if="!textModels.length" class="rounded-2 border border-amber-300/15 bg-amber-300/5 p-4 text-[12px] text-amber-100">当前工作区没有启用文本模型。先去模型管理添加一个模型。</div>
      <ASelect v-else v-model:value="selectedModel" class="max-w-xl" :placeholder="textModels[0]?.name"><ASelectOption v-for="model in textModels" :key="model.id" :value="model.slug">{{ model.name }} · {{ model.slug }}</ASelectOption></ASelect>
    </section>
    <section class="console-surface grid gap-5">
      <header><h2 class="m-0 text-[15px]">2. 创建本次验收密钥</h2><p class="mb-0 mt-1 text-[12px] text-[#718077]">完整密钥只在本页内存中保留到刷新或关闭页面。</p></header>
      <div v-if="!secret" class="flex max-w-xl flex-col gap-3 sm:flex-row"><AInput v-model:value="keyName" :maxlength="80" /><AButton type="primary" :loading="createKeyMutation.isPending.value" :disabled="keyName.trim().length < 2" @click="createKeyMutation.mutate()"><KeyRound :size="15" />创建验收密钥</AButton></div>
      <div v-else class="grid gap-3"><code class="overflow-wrap-anywhere rounded-2 border border-emerald-300/15 bg-[#09110c] p-3 text-[12px] text-[#dff2e5]">{{ secret }}</code><AButton class="w-fit" @click="copy(secret)"><Clipboard :size="15" />{{ copied ? '已复制' : '复制密钥' }}</AButton></div>
    </section>
    <section class="console-surface grid gap-5">
      <header><h2 class="m-0 text-[15px]">3. 发送真实调用</h2><p class="mb-0 mt-1 text-[12px] text-[#718077]">请求经过 API Key 鉴权、模型路由、供应商数据面、用量记录和请求日志。</p></header>
      <pre class="m-0 overflow-x-auto rounded-2 bg-[#080d0a] p-4 text-[11px] leading-6 text-[#b9c9bf]"><code>{{ sample }}</code></pre>
      <div class="flex flex-wrap gap-2"><AButton @click="copy(sample)"><Terminal :size="15" />复制 curl</AButton><AButton type="primary" :loading="callMutation.isPending.value" :disabled="!secret || !modelId" @click="callMutation.mutate()"><Rocket :size="15" />发送验证调用</AButton></div>
      <div v-if="callMutation.isPending.value" class="flex items-center gap-2 text-[12px] text-[#8ce5aa]"><LoaderCircle class="animate-spin" :size="16" />正在等待真实供应商响应…</div>
      <div v-if="callError" class="rounded-2 border border-red-400/20 bg-red-400/8 p-4 text-[12px] text-red-200">{{ callError }}</div>
      <div v-if="result" class="rounded-2 border border-emerald-300/20 bg-emerald-300/8 p-4 text-[12px] text-emerald-100"><b>首次调用成功</b><p class="my-2">{{ result.content }}</p><code>{{ result.requestId }}</code><span class="ml-3">{{ result.tokens }} tokens</span><RouterLink class="ml-3 underline" to="/console/logs">查看调用日志</RouterLink></div>
    </section>
  </ConsoleShell>
</template>
