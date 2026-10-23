<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import { AudioLines, Code2, Download, History, RotateCcw, SlidersHorizontal, Volume2 } from 'lucide-vue-next'
import type { AudioGenerationInput, AudioGenerationTask, AudioResponseFormat, CatalogModel } from '@gateway/contracts'
import { authState } from '../../../lib/auth'
import { workspaceQueryKey } from '../../../lib/workspace'
import { cancelAudioGeneration, createAudioGeneration, getAudioGeneration, listAudioGenerations } from '../api'

const props = defineProps<{ model: CatalogModel }>()
const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const text = ref('欢迎使用 Nexus API。请把这段文字转换为自然、清晰的中文语音。')
const voice = ref('male-qn-qingse')
const instruction = ref('自然、沉稳，保持适中的停顿和语速')
const language = ref('Chinese')
const speed = ref(1)
const pitch = ref(0)
const volume = ref(1)
const sampleRate = ref(32000)
const bitrate = ref(128000)
const format = ref<AudioResponseFormat>('mp3')
const preview = ref<'audio' | 'json'>('audio')
const currentTaskId = ref<string | null>(null)
const voices = [
  { value: 'male-qn-qingse', label: '青涩青年' },
  { value: 'female-shaonv', label: '少女音色' },
  { value: 'English_expressive_narrator', label: '英文叙事' },
]
const payload = computed<AudioGenerationInput>(() => ({
  model: props.model.slug,
  prompt: text.value,
  voice: voice.value,
  instruction: instruction.value || undefined,
  language: language.value || undefined,
  speech_rate: speed.value,
  pitch: pitch.value,
  volume: volume.value,
  sample_rate: sampleRate.value,
  bitrate: bitrate.value,
  response_format: format.value,
}))
const estimatedCost = computed(() => props.model.inputPrice * text.value.length / 10_000)
const formatLabel = computed(() => format.value.toUpperCase())
const canGenerate = computed(() => Boolean(text.value.trim() && voice.value.trim()))
const historyKey = computed(() => workspaceQueryKey('audio-generations', props.model.slug))
const historyQuery = useQuery({
  queryKey: historyKey,
  queryFn: ({ signal }) => listAudioGenerations(props.model.slug, signal),
  enabled: computed(() => Boolean(authState.user)),
  staleTime: 5_000,
  retry: 1,
})
const taskQuery = useQuery({
  queryKey: computed(() => workspaceQueryKey('audio-generation', currentTaskId.value)),
  queryFn: ({ signal }) => getAudioGeneration(currentTaskId.value!, signal),
  enabled: computed(() => Boolean(authState.user && currentTaskId.value)),
  refetchInterval: (query) => {
    const task = query.state.data as AudioGenerationTask | undefined
    return task && ['queued', 'processing'].includes(task.status) ? 1_500 : false
  },
  retry: 1,
})
const createMutation = useMutation({
  mutationFn: () => createAudioGeneration(payload.value),
  onSuccess: async (task) => {
    currentTaskId.value = task.id
    preview.value = 'audio'
    await queryClient.invalidateQueries({ queryKey: historyKey.value })
  },
})
const cancelMutation = useMutation({
  mutationFn: (id: string) => cancelAudioGeneration(id),
  onSuccess: async (task) => {
    queryClient.setQueryData(workspaceQueryKey('audio-generation', task.id), task)
    await queryClient.invalidateQueries({ queryKey: historyKey.value })
  },
})
const currentTask = computed(() => taskQuery.data.value ?? createMutation.data.value ?? null)
const isWorking = computed(() => currentTask.value ? ['queued', 'processing'].includes(currentTask.value.status) : false)
const statusLabels: Record<string, string> = { queued: '排队中', processing: '生成中', succeeded: '已完成', failed: '生成失败', cancelled: '已取消' }
const taskStatus = computed(() => statusLabels[currentTask.value?.status ?? ''] ?? '未提交')

watch(() => taskQuery.data.value?.status, async (status) => {
  if (status && !['queued', 'processing'].includes(status)) await queryClient.invalidateQueries({ queryKey: historyKey.value })
})

function reset() {
  text.value = ''
  voice.value = 'male-qn-qingse'
  instruction.value = ''
  language.value = 'Chinese'
  speed.value = 1
  pitch.value = 0
  volume.value = 1
  sampleRate.value = 32000
  bitrate.value = 128000
  format.value = 'mp3'
}
function signIn() { router.push({ path: '/login', query: { redirect: route.fullPath } }) }
function generate() { if (canGenerate.value && !createMutation.isPending.value) createMutation.mutate() }
function selectTask(task: AudioGenerationTask) { currentTaskId.value = task.id; preview.value = 'audio' }
function durationLabel(durationMs: number | null) {
  if (!durationMs) return '时长待返回'
  const seconds = Math.round(durationMs / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
</script>

<template>
  <div class="grid grid-cols-[minmax(340px,.42fr)_minmax(0,.58fr)] gap-5 text-white max-[900px]:grid-cols-1">
    <section class="min-w-0 overflow-hidden rounded-3 border border-[#203126] bg-white/1">
      <header class="mb-0 flex items-center justify-between border-b border-[#203126] px-5 py-4">
        <div><h2 class="m-0 text-[17px] font-650">语音合成</h2><p class="mb-0 mt-1 text-xs text-[#718078]">配置文本、音色与输出规格</p></div>
        <span class="rounded-full bg-[#63e495]/8 px-2.5 py-1 text-[11px] text-[#8de8aa]">参数预览</span>
      </header>

      <div class="grid max-h-[680px] gap-5 overflow-y-auto px-5 py-5">
        <label class="grid gap-2 text-[13px] text-[#aebbb3]">
          <span class="flex items-center justify-between"><b class="font-600 text-[#dce7de]">合成文本</b><small class="text-[11px] text-[#718078]">{{ text.length.toLocaleString() }} / 10,000</small></span>
          <textarea v-model="text" maxlength="10000" rows="7" class="min-h-38 w-full resize-y rounded-2 border border-[#2a4132] bg-[#09110c] px-3.5 py-3 text-sm leading-7 text-white outline-none placeholder:text-[#647269] focus:border-[#63e495]/55" placeholder="输入需要转换为语音的文本，可加入自然停顿和情绪提示。" />
        </label>

        <label class="grid gap-2 text-[13px] text-[#aebbb3]">
          <span class="font-600 text-[#dce7de]">音色</span>
          <input v-model="voice" list="audio-voice-options" maxlength="80" class="h-11 rounded-2 border border-[#2a4132] bg-[#09110c] px-3.5 text-sm text-white outline-none focus:border-[#63e495]/55" placeholder="选择系统音色或输入自定义 voice ID" />
          <datalist id="audio-voice-options"><option v-for="item in voices" :key="item.value" :value="item.value">{{ item.label }}</option></datalist>
          <small class="text-[11px] leading-5 text-[#718078]">支持系统音色和工作区自定义音色 ID；自定义音色需先在音色库创建。</small>
        </label>

        <label class="grid gap-2 text-[13px] text-[#aebbb3]">
          <span class="flex items-center justify-between"><b class="font-600 text-[#dce7de]">风格指令</b><small class="text-[11px] text-[#718078]">{{ instruction.length }} / 100</small></span>
          <input v-model="instruction" maxlength="100" class="h-11 rounded-2 border border-[#2a4132] bg-[#09110c] px-3.5 text-sm text-white outline-none focus:border-[#63e495]/55" placeholder="例如：语气温柔、语速稍慢，像在讲睡前故事" />
        </label>

        <label class="grid gap-2 text-[13px] text-[#aebbb3]">
          <span class="font-600 text-[#dce7de]">语言增强</span>
          <select v-model="language" class="h-11 rounded-2 border border-[#2a4132] bg-[#09110c] px-3.5 text-sm text-white outline-none focus:border-[#63e495]/55"><option value="">自动识别</option><option value="Chinese">普通话</option><option value="Chinese,Yue">粤语</option><option value="English">英语</option><option value="Japanese">日语</option><option value="Korean">韩语</option></select>
        </label>

        <div class="grid gap-4 rounded-3 border border-white/7 bg-white/2 p-4">
          <div class="flex items-center gap-2 text-sm font-650 text-[#dce7de]"><SlidersHorizontal :size="16" class="text-[#63e495]" />声音参数</div>
          <label class="grid gap-2 text-xs text-[#87958c]"><span class="flex justify-between">语速 <b class="text-[#cdd9d1]">{{ speed.toFixed(1) }}x</b></span><input v-model.number="speed" type="range" min="0.5" max="2" step="0.1" class="w-full accent-[#63e495]" /></label>
          <label class="grid gap-2 text-xs text-[#87958c]"><span class="flex justify-between">音调 <b class="text-[#cdd9d1]">{{ pitch > 0 ? `+${pitch}` : pitch }}</b></span><input v-model.number="pitch" type="range" min="-12" max="12" step="1" class="w-full accent-[#63e495]" /></label>
          <label class="grid gap-2 text-xs text-[#87958c]"><span class="flex justify-between">音量 <b class="text-[#cdd9d1]">{{ volume.toFixed(1) }}</b></span><input v-model.number="volume" type="range" min="0.1" max="2" step="0.1" class="w-full accent-[#63e495]" /></label>
        </div>

        <div class="grid grid-cols-2 gap-4 max-[560px]:grid-cols-1">
          <label class="grid gap-2 text-[13px] text-[#aebbb3]"><span class="font-600 text-[#dce7de]">采样率</span><select v-model.number="sampleRate" class="h-11 rounded-2 border border-[#2a4132] bg-[#09110c] px-3 text-sm text-white"><option :value="16000">16 kHz</option><option :value="24000">24 kHz</option><option :value="32000">32 kHz</option><option :value="44100">44.1 kHz</option></select></label>
          <label class="grid gap-2 text-[13px] text-[#aebbb3]"><span class="font-600 text-[#dce7de]">码率</span><select v-model.number="bitrate" class="h-11 rounded-2 border border-[#2a4132] bg-[#09110c] px-3 text-sm text-white"><option :value="64000">64 kbps</option><option :value="128000">128 kbps</option><option :value="256000">256 kbps</option></select></label>
        </div>

        <fieldset class="m-0 grid gap-2 border-0 p-0"><legend class="mb-2 text-[13px] font-600 text-[#dce7de]">输出格式</legend><div class="grid grid-cols-3 gap-2"><button v-for="item in (['mp3','wav','flac'] as AudioResponseFormat[])" :key="item" type="button" :class="['h-10 rounded-2 border text-xs font-650 uppercase transition active:scale-98', format === item ? 'border-[#63e495]/40 bg-[#63e495]/10 text-[#a8efbd]' : 'border-white/8 bg-white/2 text-[#87958c]']" @click="format = item">{{ item }}</button></div></fieldset>
      </div>

      <footer class="m-0 flex items-center gap-3 border-t border-[#203126] px-5 py-4 max-[560px]:flex-wrap">
        <div class="min-w-0 flex-1"><span class="block text-[11px] text-[#718078]">预计费用</span><b class="mt-1 block text-sm text-[#dce7de]">约 ¥{{ estimatedCost.toFixed(4) }}</b></div>
        <button type="button" class="inline-flex h-10 items-center gap-2 rounded-2 border border-white/9 bg-transparent px-3.5 text-xs text-[#a8b6ad] active:scale-98" @click="reset"><RotateCcw :size="14" />重置</button>
        <button v-if="!authState.user" type="button" class="h-10 rounded-2 border-0 bg-[#DCE7DE] px-5 text-sm font-700 text-[#09110c] active:scale-98" @click="signIn">登录后生成</button>
        <button v-else type="button" class="h-10 rounded-2 border-0 bg-[#DCE7DE] px-5 text-sm font-700 text-[#09110c] disabled:cursor-not-allowed disabled:opacity-45" :disabled="!canGenerate || createMutation.isPending.value || isWorking" @click="generate">{{ createMutation.isPending.value ? '正在提交…' : isWorking ? '任务处理中' : '生成音频' }}</button>
      </footer>
    </section>

    <section class="min-w-0 overflow-hidden rounded-3 border border-[#203126] bg-white/1">
      <header class="mb-0 flex items-center justify-between border-b border-[#203126] px-5 py-4">
        <div class="flex gap-5"><button type="button" :class="['inline-flex items-center gap-2 border-0 bg-transparent px-0 py-1 text-sm', preview === 'audio' ? 'text-[#63e495]' : 'text-[#7f8d84]']" @click="preview = 'audio'"><Volume2 :size="16" />音频预览</button><button type="button" :class="['inline-flex items-center gap-2 border-0 bg-transparent px-0 py-1 text-sm', preview === 'json' ? 'text-[#63e495]' : 'text-[#7f8d84]']" @click="preview = 'json'"><Code2 :size="16" />参数 JSON</button></div>
        <span :class="['text-[11px]', currentTask?.status === 'failed' ? 'text-[#f39a9a]' : currentTask?.status === 'succeeded' ? 'text-[#63e495]' : 'text-[#829087]']">{{ taskStatus }}</span>
      </header>

      <pre v-if="preview === 'json'" class="m-5 max-h-[590px] overflow-auto whitespace-pre-wrap break-words rounded-2 bg-[#08100b] p-5 text-xs leading-6 text-[#b9c9bf]">{{ JSON.stringify(payload, null, 2) }}</pre>
      <div v-else class="grid min-h-[420px] place-items-center p-6">
        <div class="w-full max-w-xl rounded-4 border border-[#254330] bg-[radial-gradient(circle_at_50%_0%,rgba(99,228,149,.1),transparent_58%)] p-6 text-center">
          <span class="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[#63e495]/22 bg-[#63e495]/8 text-[#63e495]"><AudioLines :size="28" /></span>
          <template v-if="!currentTask">
            <h3 class="mb-2 mt-5 text-lg">等待生成音频</h3>
            <p class="m-auto max-w-sm text-[13px] leading-6 text-[#839188]">配置左侧文本与声音参数，任务完成后可在此试听并下载 {{ formatLabel }} 文件。</p>
          </template>
          <template v-else-if="isWorking">
            <h3 class="mb-2 mt-5 text-lg">{{ taskStatus }}</h3>
            <p class="m-auto max-w-sm text-[13px] leading-6 text-[#839188]">任务已持久化，页面会自动查询供应商处理状态。</p>
            <button v-if="currentTask.status === 'queued'" type="button" class="mt-4 h-9 rounded-2 border border-white/10 bg-transparent px-4 text-xs text-[#aebbb3]" :disabled="cancelMutation.isPending.value" @click="cancelMutation.mutate(currentTask.id)">取消任务</button>
          </template>
          <template v-else-if="currentTask.status === 'failed'">
            <h3 class="mb-2 mt-5 text-lg text-[#efaaaa]">生成失败</h3>
            <p class="m-auto max-w-sm text-[13px] leading-6 text-[#a98282]">{{ currentTask.errorMessage || '供应商暂时无法完成此任务，请稍后重试。' }}</p>
          </template>
          <template v-else-if="currentTask.status === 'cancelled'">
            <h3 class="mb-2 mt-5 text-lg">任务已取消</h3>
            <p class="m-auto max-w-sm text-[13px] leading-6 text-[#839188]">本次请求未继续处理，可以调整参数后重新提交。</p>
          </template>
          <template v-else>
            <h3 class="mb-2 mt-5 text-lg">音频已生成</h3>
            <p class="m-auto max-w-sm text-[13px] leading-6 text-[#839188]">{{ currentTask.promptPreview }}</p>
          </template>
          <div class="mx-auto my-7 flex h-16 max-w-md items-center justify-center gap-1.5" aria-hidden="true"><i v-for="height in [18,32,46,28,54,38,24,50,34,20,42,26,48,30,16]" :key="height" :class="['w-1.5 rounded-full', isWorking ? 'animate-pulse bg-[#63e495]/50' : 'bg-[#63e495]/22']" :style="{ height: `${height}px` }" /></div>
          <audio v-if="currentTask?.status === 'succeeded' && currentTask.resultUrl" class="w-full" :src="currentTask.resultUrl" controls preload="metadata" />
          <div v-else class="flex items-center gap-3 rounded-3 border border-white/7 bg-[#08100b] px-4 py-3 text-left"><button type="button" class="grid h-9 w-9 place-items-center rounded-full border-0 bg-[#DCE7DE] text-[#09110c]" disabled><Volume2 :size="16" /></button><div class="min-w-0 flex-1"><b class="block text-xs text-[#dce7de]">{{ currentTask ? taskStatus : '尚未生成' }}</b><span class="mt-1 block text-[10px] text-[#65736a]">{{ currentTask ? durationLabel(currentTask.durationMs) : '0:00 / 0:00' }}</span></div><a v-if="currentTask?.resultUrl" class="grid h-8 w-8 place-items-center text-[#63e495]" :href="currentTask.resultUrl" target="_blank" rel="noopener noreferrer" aria-label="下载音频"><Download :size="16" /></a><button v-else type="button" class="grid h-8 w-8 place-items-center border-0 bg-transparent text-[#65736a]" aria-label="下载音频" disabled><Download :size="16" /></button></div>
        </div>
      </div>

      <div class="mx-5 border-t border-[#203126] py-5">
        <h3 class="m-0 flex items-center gap-2 text-sm"><History :size="16" class="text-[#63e495]" />生成记录</h3>
        <p v-if="createMutation.isError.value" class="mb-0 mt-3 text-xs leading-6 text-[#efaaaa]">{{ createMutation.error.value?.message }}</p>
        <p v-if="historyQuery.isPending.value" class="mb-0 mt-3 text-xs leading-6 text-[#718078]">正在加载任务记录…</p>
        <p v-else-if="historyQuery.isError.value" class="mb-0 mt-3 text-xs leading-6 text-[#efaaaa]">任务记录加载失败，请检查登录和工作区状态。</p>
        <p v-else-if="!historyQuery.data.value?.data.length" class="mb-0 mt-3 text-xs leading-6 text-[#718078]">暂无音频任务，提交后会在这里显示处理状态、费用和结果。</p>
        <div v-else class="mt-3 grid max-h-52 gap-2 overflow-y-auto pr-1">
          <button v-for="task in historyQuery.data.value?.data" :key="task.id" type="button" :class="['grid grid-cols-[1fr_auto] gap-2 rounded-2 border px-3 py-2.5 text-left', currentTaskId === task.id ? 'border-[#63e495]/35 bg-[#63e495]/7' : 'border-white/7 bg-white/2']" @click="selectTask(task)">
            <span class="min-w-0"><b class="block truncate text-xs text-[#dce7de]">{{ task.promptPreview }}</b><small class="mt-1 block text-[10px] text-[#718078]">{{ task.voice }} · 约 ¥{{ task.estimatedCostCny.toFixed(4) }}</small></span>
            <span :class="['self-center text-[11px]', task.status === 'succeeded' ? 'text-[#63e495]' : task.status === 'failed' ? 'text-[#efaaaa]' : 'text-[#8d9a92]']">{{ { queued: '排队中', processing: '生成中', succeeded: '已完成', failed: '失败', cancelled: '已取消' }[task.status] }}</span>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
