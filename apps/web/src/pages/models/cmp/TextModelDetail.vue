<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, ArrowRight, Copy, FileText, LoaderCircle, Play, Trash2 } from 'lucide-vue-next'
import type { CatalogModel, OpenAIChatCompletionResponse } from '@gateway/contracts'
import MediaPlayground from './MediaPlayground.vue'
import ModelLogo from '../../../components/ModelLogo.vue'
import { authState } from '../../../lib/auth'
import { request } from '../../../lib/http'

const props = defineProps<{ model: CatalogModel }>()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const tab = computed(() => route.query.tab === 'api' ? 'api' : 'playground')
const prompt = ref('')
const output = ref('')
const error = ref('')
const pending = ref(false)
const copied = ref('')
const usage = ref('')
let controller: AbortController | null = null
const price = (value: number | null) => value === null ? '—' : `¥${value.toFixed(2)}`
const apiOrigin = new URL(import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin), window.location.origin).origin
const sample = computed(() => `curl "${apiOrigin}/v1/chat/completions" \\\n  -H "Authorization: Bearer $NEXUS_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify({ model: props.model.slug, messages: [{ role: 'user', content: '你好，请介绍一下自己。' }], max_tokens: 2048, stream: false }, null, 2)}'`)
function changeTab(value: string) { router.replace({ query: { ...route.query, tab: value } }) }
async function copy(value: string, name: string) {
  try { await navigator.clipboard.writeText(value); copied.value = name } catch { error.value = '复制失败，请手动选择文本复制。' }
}
async function run() {
  if (!authState.user) { await router.push({ path: '/login', query: { redirect: route.fullPath } }); return }
  if (!prompt.value.trim() || pending.value) return
  error.value = ''; output.value = ''; usage.value = ''; copied.value = ''; pending.value = true
  controller = new AbortController()
  try {
    const result = await request<OpenAIChatCompletionResponse>({ method: 'POST', url: '/api/console/playground/chat', data: { model: props.model.slug, prompt: prompt.value.trim() }, signal: controller.signal, timeout: 65_000 })
    output.value = result.choices.map((choice) => choice.message.content).join('\n')
    usage.value = `${result.usage.total_tokens.toLocaleString()} Tokens`
    if (!output.value) error.value = '模型未返回文本，请稍后重试。'
  } catch (reason) {
    if (!controller.signal.aborted) error.value = reason instanceof Error ? reason.message : '调用失败，请稍后重试。'
  } finally { pending.value = false }
}
watch(() => props.model.slug, () => { controller?.abort(); prompt.value = ''; output.value = ''; error.value = ''; usage.value = '' })
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <main class="text-model-page">
    <RouterLink class="model-back" to="/models"><ArrowLeft :size="15" />返回模型广场</RouterLink>
    <section class="text-model-heading">
      <ModelLogo :owner="model.owner" :provider="model.provider" :name="model.name" :accent="model.accent" :size="80" />
      <div class="text-model-summary"><h1>{{ model.name }}</h1><p>{{ model.provider }} / {{ model.type === 'video' ? '视频模型' : model.type === 'image' ? '图像模型' : '文字模型' }}</p><p class="model-description-copy">{{ t(model.descriptionKey) }}</p><div class="model-capabilities"><span>{{ model.type === 'video' ? '视频生成' : model.type === 'image' ? '图像生成' : '文本生成' }}</span><span v-for="capability in model.capabilities" :key="capability">{{ t(`modelDetail.capability.${capability}`) }}</span></div></div>
      <div v-if="model.type === 'text'" class="text-model-prices"><div><span>输入价格</span><p><strong>{{ price(model.inputPrice) }}</strong> / 1M tokens</p></div><div><span>输出价格</span><p><strong>{{ price(model.outputPrice) }}</strong> / 1M tokens</p></div></div>
      <div v-if="model.type !== 'text'" class="text-model-prices"><div><span>参考价格</span><p><strong>{{ price(model.inputPrice) }}</strong> {{ model.priceUnit === 'second' ? '/ 秒' : model.priceUnit === 'image' ? '/ 张' : '/ 1M tokens' }}</p></div></div>
    </section>
    <div class="text-model-tabs" role="tablist" aria-label="模型使用方式"><button id="playground-tab" role="tab" :aria-selected="tab === 'playground'" aria-controls="model-panel" :class="{ active: tab === 'playground' }" @click="changeTab('playground')">在线调用</button><button id="api-tab" role="tab" :aria-selected="tab === 'api'" aria-controls="model-panel" :class="{ active: tab === 'api' }" @click="changeTab('api')">接入说明</button></div>
    <section id="model-panel" role="tabpanel" :aria-labelledby="tab === 'api' ? 'api-tab' : 'playground-tab'">
      <MediaPlayground v-if="tab === 'playground' && model.type !== 'text'" :key="model.slug" :model="model" />
      <div v-else-if="tab === 'playground'" class="text-model-workbench">
        <form class="model-input-panel" @submit.prevent="run">
          <header><label for="model-prompt">提示词</label><button type="button" :disabled="pending || !prompt" @click="prompt = ''"><Trash2 :size="15" />清空</button></header>
          <div class="model-prompt-wrap"><textarea id="model-prompt" v-model="prompt" maxlength="8000" :disabled="pending" placeholder="请帮我写一份产品需求文档（PRD），主题是「学生个人知识库应用」。包含背景、核心功能和用户流程，使用 Markdown 输出。" /><span>{{ prompt.length }} / 8000</span></div>
          <footer><div><span>当前模型</span><code>{{ model.slug }}</code></div><button class="model-run" type="submit" :disabled="pending || (!!authState.user && !prompt.trim())"><LoaderCircle v-if="pending" :size="17" class="spin" /><Play v-else :size="17" />{{ pending ? '正在调用…' : authState.user ? '开始调用' : '登录后调用' }}</button></footer>
          <p class="model-call-note">使用当前工作区，单次最多输出 2,048 Tokens，实际用量记入调用日志。</p>
        </form>
        <article class="model-output-panel"><header><h2>输出结果</h2><button :disabled="!output" @click="copy(output, 'output')"><Copy :size="15" />{{ copied === 'output' ? '已复制' : '复制' }}</button></header><div class="model-output" aria-live="polite" :aria-busy="pending"><div v-if="pending" class="model-output-empty"><LoaderCircle class="spin" :size="27" /><strong>模型正在思考</strong><p>正在等待模型返回结果…</p></div><div v-else-if="error" class="model-output-empty model-error" role="alert"><strong>调用未完成</strong><p>{{ error }}</p><RouterLink to="/console/models">检查工作区模型配置 <ArrowRight :size="14" /></RouterLink></div><pre v-else-if="output">{{ output }}</pre><div v-else class="model-output-empty"><FileText :size="32" /><strong>暂无输出结果</strong><p>在左侧输入提示词并点击「开始调用」，<br />即可在这里查看模型的回复内容。</p></div></div><p v-if="usage" class="model-call-note">本次用量：{{ usage }}</p></article>
      </div>
      <article v-else-if="model.type === 'text'" class="model-api-panel"><header><div><h2>OpenAI 兼容调用</h2><p>在工作区启用模型，创建 API Key 后即可从服务端发起请求。</p></div><button @click="copy(sample, 'sample')"><Copy :size="15" />{{ copied === 'sample' ? '已复制' : '复制示例' }}</button></header><pre><code>{{ sample }}</code></pre><p>将 NEXUS_KEY 替换为控制台创建的密钥。密钥请保存在服务端环境变量中。在线体验使用登录会话，SDK 接入使用 API Key。</p></article>
      <article v-else class="model-api-panel"><h2>生成任务接入说明</h2><p>图像与视频生成接口接入中，暂未开放任务提交。后续通过提交生成任务、查询状态、获取结果的流程接入，当前可预览生成参数。</p></article>
    </section>
    <section class="model-integration"><header><h2>接入步骤</h2><p>3 步即可在你的应用中使用本模型</p></header><div class="model-integration-grid"><article><span>1</span><div><h3>创建 API Key</h3><p>在控制台创建密钥，用于 API 调用身份验证。</p><RouterLink to="/console/keys">前往密钥管理 <ArrowRight :size="14" /></RouterLink></div></article><article><span>2</span><div><h3>开通模型</h3><p>在工作区模型管理中启用 {{ model.name }}。</p><RouterLink to="/console/models">前往模型管理 <ArrowRight :size="14" /></RouterLink></div></article><article><span>3</span><div><h3>调用 API</h3><p>使用模型 ID 与请求示例接入你的应用。</p><button @click="changeTab('api')">查看接入说明 <ArrowRight :size="14" /></button></div></article></div></section>
  </main>
</template>

<style scoped src="./text-model-detail.css"></style>
