<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Code2, ImagePlus, Image as ImageIcon, Video, Upload, X, RotateCcw } from 'lucide-vue-next'
import type { CatalogModel } from '@gateway/contracts'
import { authState } from '../../../lib/auth'

const props = defineProps<{ model: CatalogModel }>()
const route = useRoute()
const router = useRouter()
const isVideo = computed(() => props.model.type === 'video')
const mode = ref('text')
const prompt = ref('')
const ratio = ref('16:9')
const resolution = ref('720p')
const quality = ref('medium')
const duration = ref(5)
const count = ref(1)
const audio = ref(true)
const preview = ref('preview')
const error = ref('')
const assets = ref<Array<{ name: string; url: string }>>([])
const payload = computed(() => ({ model: props.model.slug, mode: mode.value, prompt: prompt.value, aspect_ratio: ratio.value,
  ...(isVideo.value ? { duration: duration.value, resolution: resolution.value, generate_audio: audio.value } : { quality: quality.value, n: count.value }),
  references: assets.value.map((item) => item.name),
}))
function remove(index: number) { URL.revokeObjectURL(assets.value[index].url); assets.value.splice(index, 1) }
function reset() { assets.value.forEach((item) => URL.revokeObjectURL(item.url)); assets.value = []; prompt.value = ''; mode.value = 'text'; ratio.value = '16:9'; resolution.value = '720p'; quality.value = 'medium'; duration.value = 5; count.value = 1; audio.value = true; error.value = '' }
function filesChanged(event: Event) {
  error.value = ''
  const input = event.target as HTMLInputElement
  for (const file of Array.from(input.files ?? [])) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) { error.value = '请选择 10MB 以内的 JPG、PNG 或 WebP 图片。'; continue }
    if (assets.value.length >= 4) { error.value = '当前预览最多选择 4 张参考图。'; break }
    assets.value.push({ name: file.name, url: URL.createObjectURL(file) })
  }
  input.value = ''
}
function signIn() { router.push({ path: '/login', query: { redirect: route.fullPath } }) }
onBeforeUnmount(() => assets.value.forEach((item) => URL.revokeObjectURL(item.url)))
</script>

<template>
  <div class="media-workbench">
    <section class="media-config">
      <header><h2>{{ isVideo ? '视频生成' : '图像生成' }}</h2><span>参数预览</span></header>
      <div class="media-controls">
        <label>生成模式<select v-model="mode"><option value="text">{{ isVideo ? '文生视频' : '文生图' }}</option><option value="reference">{{ isVideo ? '图生视频' : '参考图生成' }}</option></select></label>
        <label>提示词<textarea v-model="prompt" maxlength="8000" rows="5" :placeholder="isVideo ? '描述主体、动作、镜头运动与场景，例如：镜头缓慢推进，晨光穿过树林，树叶随风轻动。' : '描述主体、构图、风格与光线，例如：极简产品摄影，白色陶瓷杯，柔和自然光。'" /><small>{{ prompt.length }} / 8000</small></label>
        <div v-if="mode === 'reference'" class="reference-input"><span>参考图片</span><label class="media-upload"><Upload :size="22" /><span>选择参考图片</span><small>JPG / PNG / WebP，单张不超过 10MB</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple @change="filesChanged" /></label><div class="reference-thumbnails"><div v-for="(asset, index) in assets" :key="asset.url"><img :src="asset.url" :alt="asset.name" /><button :aria-label="`移除 ${asset.name}`" @click="remove(index)"><X :size="14" /></button></div></div><small>仅供本地预览，尚未上传。</small></div>
        <label>画面比例<select v-model="ratio"><option>16:9</option><option>9:16</option><option>1:1</option><option>4:3</option><option>3:4</option></select></label>
        <template v-if="isVideo"><div class="media-parameter-row"><label>时长<select v-model.number="duration"><option :value="5">5 秒</option><option :value="10">10 秒</option><option :value="15">15 秒</option></select></label><label>分辨率<select v-model="resolution"><option>480p</option><option>720p</option><option>1080p</option></select></label></div><label class="media-audio"><span>生成音频</span><input v-model="audio" type="checkbox" /></label></template>
        <div v-else class="media-parameter-row"><label>质量<select v-model="quality"><option value="low">标准</option><option value="medium">精细</option><option value="high">高质量</option></select></label><label>生成数量<select v-model.number="count"><option :value="1">1 张</option><option :value="2">2 张</option><option :value="4">4 张</option></select></label></div>
        <p v-if="error" class="media-error" role="alert">{{ error }}</p>
      </div>
      <footer><p>生成接口接入中，当前可预览参数；可用选项以上线后的模型能力为准。</p><div><button class="media-reset" @click="reset"><RotateCcw :size="15" />重置</button><button v-if="!authState.user" class="media-primary" @click="signIn">登录账户</button><button v-else class="media-primary" disabled>生成接口接入中</button></div></footer>
    </section>
    <section class="media-result"><header><div class="media-result-tabs"><button :class="{ active: preview === 'preview' }" @click="preview = 'preview'">{{ isVideo ? '视频预览' : '图片预览' }}</button><button :class="{ active: preview === 'json' }" @click="preview = 'json'"><Code2 :size="15" />参数 JSON</button></div><span>未提交</span></header><pre v-if="preview === 'json'">{{ JSON.stringify(payload, null, 2) }}</pre><div v-else class="media-preview-stage" :style="{ aspectRatio: ratio.replace(':', '/') }"><Video v-if="isVideo" :size="40" /><ImageIcon v-else :size="40" /><strong>{{ isVideo ? '暂无生成的视频' : '暂无生成的图片' }}</strong><p>配置左侧参数，生成结果将在这里展示。</p><span class="media-preview-ratio">{{ ratio }}</span></div><div class="media-history"><h3><ImagePlus :size="17" />{{ isVideo ? '视频任务' : '生成记录' }}</h3><p>暂无任务记录。真实生成服务接入后，可查看任务状态和结果。</p></div></section>
  </div>
</template>

<style scoped>
.media-workbench { display:grid; grid-template-columns:minmax(320px,.36fr) minmax(0,.64fr); gap:22px; color:#fff; }
.media-config,.media-result { min-width:0; border:1px solid #203126; border-radius:10px; background:rgba(255,255,255,.012); }
header { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:64px; padding:18px 22px; border-bottom:1px solid #203126; }
h2 { margin:0; font-size:17px; } header > span { color:#94aa9b; font-size:12px; }
.media-controls { display:flex; flex-direction:column; gap:20px; padding:22px; max-height:620px; overflow-y:auto; }
label,.reference-input { display:flex; flex-direction:column; gap:9px; font-size:14px; color:#d3dfd7; }
input,textarea,select,button { font:inherit; } select,textarea { width:100%; border:1px solid #304b39; border-radius:8px; padding:11px 12px; color:#fff; background:#0a140e; }
textarea { resize:vertical; line-height:1.7; min-height:140px; } textarea::placeholder { color:#8d9f94; } small { font-size:12px; color:#9badA1; line-height:1.6; }
.media-parameter-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; } .media-audio { flex-direction:row; align-items:center; justify-content:space-between; } input[type=checkbox] { accent-color:#63e495; width:18px; height:18px; }
.media-upload { position:relative; padding:20px 12px; border:1px dashed #34513e; border-radius:8px; align-items:center; cursor:pointer; text-align:center; } .media-upload input { position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:pointer; }
.reference-thumbnails { display:flex; flex-wrap:wrap; gap:10px; } .reference-thumbnails > div { position:relative; } .reference-thumbnails img { width:66px; height:66px; object-fit:cover; border-radius:6px; } .reference-thumbnails button { position:absolute; top:0; right:0; padding:4px; border:0; background:#0a140e; color:#fff; }
footer { padding:16px 22px 22px; border-top:1px solid #203126; } footer p { margin:0 0 14px; font-size:12px; line-height:1.7; color:#a6b5ab; } footer > div { display:flex; gap:12px; } footer button { display:flex; align-items:center; justify-content:center; gap:7px; border-radius:8px; min-height:44px; padding:0 14px; font-size:14px; } .media-reset { border:1px solid #304b39; background:transparent; color:#fff; } .media-primary { flex:1; border:0; background:#63e495; color:#07140c; font-weight:650; } button:disabled { opacity:.45; cursor:not-allowed; }
.media-result { padding-bottom:22px; } .media-result-tabs { display:flex; gap:22px; } .media-result-tabs button { display:flex; align-items:center; gap:7px; border:0; padding:0; background:none; color:#a6b5ab; font-size:14px; } .media-result-tabs button.active { color:#63e495; }
.media-preview-stage { position:relative; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:16px; margin:22px; max-height:520px; min-height:220px; border:1px dashed #263c2e; border-radius:8px; color:#9fb0a5; } .media-preview-stage strong { color:#fff; font-size:16px; } .media-preview-stage p { font-size:14px; margin:0; padding:0 18px; text-align:center; } .media-preview-ratio { position:absolute; bottom:12px; right:14px; font-size:12px; }
pre { margin:22px; padding:18px; white-space:pre-wrap; overflow-wrap:anywhere; background:#09110c; border-radius:8px; color:#c3d0c7; font:13px/1.8 monospace; }
.media-history { margin:24px 22px 0; border-top:1px solid #203126; padding-top:20px; } h3 { display:flex; gap:9px; margin:0; align-items:center; font-size:15px; } .media-history p { color:#a6b5ab; font-size:13px; line-height:1.7; } .media-error { color:#f4a5a5; font-size:13px; }
@media(max-width:900px) { .media-workbench { grid-template-columns:1fr; } .media-controls { max-height:none; } }
</style>
