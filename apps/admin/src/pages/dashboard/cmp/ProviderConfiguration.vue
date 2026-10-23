<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, reactive, ref } from 'vue'
import { Activity, Boxes, KeyRound, Plus, ServerCog, Trash2, X } from 'lucide-vue-next'
import type { ModelDeployment, ProviderChannel, ProviderCredential } from '../api'
import {
  createModelDeployment, createProviderChannel, createProviderCredential, deleteModelDeployment, deleteProviderChannel, deleteProviderCredential,
  getAdminModels, getModelDeployments, getProviderChannels, getProviderCredentials, getProviders,
  updateModelDeployment, updateProviderChannel, updateProviderCredential,
} from '../api'
import ProviderRegistry from './ProviderRegistry.vue'

const queryClient = useQueryClient()
const dialog = ref<'credential' | 'channel' | 'deployment' | null>(null)
const errorMessage = ref('')
const providers = useQuery({ queryKey: ['admin-providers'], queryFn: getProviders })
const credentials = useQuery({ queryKey: ['admin-provider-credentials'], queryFn: getProviderCredentials })
const channels = useQuery({ queryKey: ['admin-provider-channels'], queryFn: getProviderChannels })
const deployments = useQuery({ queryKey: ['admin-model-deployments'], queryFn: getModelDeployments })
const models = useQuery({ queryKey: ['admin-models-for-deployment'], queryFn: () => getAdminModels({ page: 1, pageSize: 100 }) })
const credentialForm = reactive({ name: '', provider: '', environment: 'development' as const, apiKey: '' })
const channelForm = reactive({ name: '', credentialId: '', region: 'global', timeoutMs: 60_000, maxConcurrency: 100 })
const deploymentForm = reactive({ modelId: '', channelId: '', upstreamModelId: '', priority: 100, weight: 100 })
const selectedCredential = computed(() => credentials.data.value?.data.find((item) => item.id === channelForm.credentialId))
const enabledChannels = computed(() => channels.data.value?.data.filter((item) => item.enabled) ?? [])
const enabledProviders = computed(() => providers.data.value?.data.filter((item) => item.enabled) ?? [])

const invalidate = async () => Promise.all([
  queryClient.invalidateQueries({ queryKey: ['admin-provider-credentials'] }),
  queryClient.invalidateQueries({ queryKey: ['admin-provider-channels'] }),
  queryClient.invalidateQueries({ queryKey: ['admin-model-deployments'] }),
])

const createCredentialMutation = useMutation({
  mutationFn: () => createProviderCredential({ ...credentialForm, enabled: true }),
  onSuccess: async () => { dialog.value = null; await invalidate() },
  onError: (error) => { errorMessage.value = error.message },
})

const createChannelMutation = useMutation({
  mutationFn: () => {
    const credential = selectedCredential.value
    if (!credential) throw new Error('请选择供应商凭证')
    return createProviderChannel({ ...channelForm, provider: credential.provider, environment: credential.environment, enabled: true })
  },
  onSuccess: async () => { dialog.value = null; await invalidate() },
  onError: (error) => { errorMessage.value = error.message },
})
const createDeploymentMutation = useMutation({
  mutationFn: () => createModelDeployment({ ...deploymentForm, enabled: true }),
  onSuccess: async () => { dialog.value = null; await invalidate() },
  onError: (error) => { errorMessage.value = error.message },
})
const channelMutation = useMutation({ mutationFn: ({ item, enabled }: { item: ProviderChannel; enabled: boolean }) => updateProviderChannel(item.id, { enabled }), onSuccess: invalidate })
const deploymentMutation = useMutation({ mutationFn: ({ item, enabled }: { item: ModelDeployment; enabled: boolean }) => updateModelDeployment(item.id, { enabled }), onSuccess: invalidate })
const credentialMutation = useMutation({ mutationFn: ({ item, enabled }: { item: ProviderCredential; enabled: boolean }) => updateProviderCredential(item.id, { enabled }), onSuccess: invalidate, onError: (error) => { errorMessage.value = error.message } })
const removeCredentialMutation = useMutation({ mutationFn: deleteProviderCredential, onSuccess: invalidate, onError: (error) => { errorMessage.value = error.message } })
const removeChannelMutation = useMutation({ mutationFn: deleteProviderChannel, onSuccess: invalidate, onError: (error) => { errorMessage.value = error.message } })
const removeDeploymentMutation = useMutation({ mutationFn: deleteModelDeployment, onSuccess: invalidate, onError: (error) => { errorMessage.value = error.message } })

function open(value: 'credential' | 'channel' | 'deployment') {
  errorMessage.value = ''
  if (value === 'credential') {
    Object.assign(credentialForm, { name: '', provider: enabledProviders.value[0]?.code ?? '', environment: 'development', apiKey: '' })
  } else if (value === 'channel') {
    Object.assign(channelForm, { name: '', credentialId: credentials.data.value?.data.find((item) => item.enabled)?.id ?? '', region: 'global', timeoutMs: 60_000, maxConcurrency: 100 })
  } else {
    Object.assign(deploymentForm, { modelId: models.data.value?.data[0]?.id ?? '', channelId: enabledChannels.value[0]?.id ?? '', upstreamModelId: '', priority: 100, weight: 100 })
  }
  dialog.value = value
}

function submit() {
  if (dialog.value === 'credential') createCredentialMutation.mutate()
  else if (dialog.value === 'channel') createChannelMutation.mutate()
  else createDeploymentMutation.mutate()
}

function statusLabel(status: ProviderChannel['healthStatus']) {
  return { unknown: '待探测', healthy: '健康', degraded: '降级', unhealthy: '已熔断' }[status]
}

function removeChannel(item: ProviderChannel) {
  if (window.confirm(`确认删除渠道“${item.name}”？`)) removeChannelMutation.mutate(item.id)
}
function removeCredential(item: ProviderCredential) {
  if (window.confirm(`确认删除凭证“${item.name}”？`)) removeCredentialMutation.mutate(item.id)
}
function removeDeployment(item: ModelDeployment) {
  if (window.confirm(`确认删除 ${item.modelName} 的部署？`)) removeDeploymentMutation.mutate(item.id)
}
</script>

<template>
  <div class="mt-6 grid gap-4">
    <p v-if="errorMessage" class="m-0 rounded-2 border border-red-400/20 bg-red-400/8 px-4 py-3 text-13px text-red-300">{{ errorMessage }}</p>
    <ProviderRegistry />
    <section class="overflow-hidden rounded-14px border border-white/9 bg-white/2">
      <header class="min-h-68px flex items-center justify-between gap-4 border-b border-white/7 px-18px py-4">
        <div><h2 class="m-0 text-15px">供应商凭证</h2><p class="mb-0 mt-1 text-13px text-[#647268]">密钥写入后立即加密，页面只显示名称、环境和末四位。</p></div>
        <button class="h-36px flex items-center gap-2 rounded-9px border-0 bg-[#DCE7DE] px-4 text-13px font-700 text-[#07100a]" @click="open('credential')"><Plus :size="15" />新增凭证</button>
      </header>
      <div class="overflow-x-auto"><table class="w-full min-w-760px border-collapse">
        <thead><tr class="text-left text-13px text-[#a6b5ab]"><th class="p-14px">名称</th><th>供应商</th><th>环境</th><th>密钥</th><th>轮换时间</th><th>状态</th><th class="pr-14px text-right">操作</th></tr></thead>
        <tbody>
          <tr v-if="credentials.isPending.value"><td colspan="7" class="p-8 text-center text-13px text-[#718078]">正在加载凭证…</td></tr>
          <tr v-else-if="!credentials.data.value?.data.length"><td colspan="7" class="p-8 text-center text-13px text-[#718078]">尚未配置供应商凭证。</td></tr>
          <tr v-for="item in credentials.data.value?.data" :key="item.id" class="border-t border-white/6 text-13px text-[#c3d0c7]">
            <td class="p-14px"><div class="flex items-center gap-3"><span class="h-8 w-8 grid place-items-center rounded-8px bg-emerald-300/8 text-emerald-300"><KeyRound :size="16" /></span><b class="text-white">{{ item.name }}</b></div></td>
            <td>{{ item.provider }}</td><td>{{ item.environment }}</td><td class="font-mono">{{ item.maskedKey }}</td><td>{{ new Date(item.rotatedAt).toLocaleDateString('zh-CN') }}</td>
            <td><button :class="['rounded-7px border-0 px-2 py-1 text-12px',item.enabled?'bg-emerald-300/8 text-emerald-300':'bg-white/4 text-[#7c8980]']" @click="credentialMutation.mutate({item,enabled:!item.enabled})">{{ item.enabled?'已启用':'已停用' }}</button></td>
            <td class="pr-14px text-right"><button class="h-8 w-8 inline-grid place-items-center rounded-8px border border-white/8 bg-transparent text-[#77867c] hover:text-red-300" aria-label="删除凭证" @click="removeCredential(item)"><Trash2 :size="15" /></button></td>
          </tr>
        </tbody>
      </table></div>
    </section>
    <section class="overflow-hidden rounded-14px border border-white/9 bg-white/2">
      <header class="min-h-68px flex items-center justify-between gap-4 border-b border-white/7 px-18px py-4">
        <div><h2 class="m-0 text-15px">供应商渠道</h2><p class="mb-0 mt-1 text-13px text-[#647268]">绑定加密凭证、环境、区域与渠道级可靠性参数。</p></div>
        <button class="h-36px flex items-center gap-2 rounded-9px border-0 bg-[#DCE7DE] px-4 text-13px font-700 text-[#07100a]" @click="open('channel')"><Plus :size="15" />新增渠道</button>
      </header>
      <div class="overflow-x-auto">
        <table class="w-full min-w-900px border-collapse">
          <thead><tr class="text-left text-13px text-[#a6b5ab]"><th class="p-14px">渠道</th><th>环境 / 区域</th><th>凭证</th><th>健康度</th><th>超时 / 并发</th><th>状态</th><th class="pr-14px text-right">操作</th></tr></thead>
          <tbody>
            <tr v-if="channels.isPending.value"><td colspan="7" class="p-8 text-center text-13px text-[#718078]">正在加载渠道…</td></tr>
            <tr v-else-if="!channels.data.value?.data.length"><td colspan="7" class="p-8 text-center text-13px text-[#718078]">尚未配置渠道，请先创建供应商凭证，再新增渠道。</td></tr>
            <tr v-for="item in channels.data.value?.data" :key="item.id" class="border-t border-white/6 text-13px text-[#c3d0c7]">
              <td class="p-14px"><div class="flex items-center gap-3"><span class="h-8 w-8 grid place-items-center rounded-8px bg-emerald-300/8 text-emerald-300"><ServerCog :size="16" /></span><div class="grid gap-1"><b class="text-white">{{ item.name }}</b><small class="text-[#6f7e74]">{{ item.provider }}</small></div></div></td>
              <td>{{ item.environment }} / {{ item.region }}</td><td>{{ item.credentialName }} · {{ item.credentialMaskedKey }}</td>
              <td><span :class="['rounded-full px-2 py-1 text-12px', item.healthStatus==='healthy'?'bg-emerald-300/8 text-emerald-300':item.healthStatus==='unhealthy'?'bg-red-400/8 text-red-300':'bg-amber-300/8 text-amber-200']">{{ statusLabel(item.healthStatus) }}<template v-if="item.consecutiveFailures"> · {{ item.consecutiveFailures }}</template></span></td>
              <td>{{ item.timeoutMs / 1000 }}s / {{ item.maxConcurrency }}</td>
              <td><button :class="['rounded-7px border-0 px-2 py-1 text-12px',item.enabled?'bg-emerald-300/8 text-emerald-300':'bg-white/4 text-[#7c8980]']" @click="channelMutation.mutate({item,enabled:!item.enabled})">{{ item.enabled?'已启用':'已停用' }}</button></td>
              <td class="pr-14px text-right"><button class="h-8 w-8 inline-grid place-items-center rounded-8px border border-white/8 bg-transparent text-[#77867c] hover:text-red-300" aria-label="删除渠道" @click="removeChannel(item)"><Trash2 :size="15" /></button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="overflow-hidden rounded-14px border border-white/9 bg-white/2">
      <header class="min-h-68px flex items-center justify-between gap-4 border-b border-white/7 px-18px py-4">
        <div><h2 class="m-0 text-15px">模型部署</h2><p class="mb-0 mt-1 text-13px text-[#647268]">将公开模型映射到具体渠道和上游模型 ID，路由按健康度与优先级选择。</p></div>
        <button class="h-36px flex items-center gap-2 rounded-9px border-0 bg-[#DCE7DE] px-4 text-13px font-700 text-[#07100a]" @click="open('deployment')"><Plus :size="15" />新增部署</button>
      </header>
      <div class="overflow-x-auto">
        <table class="w-full min-w-900px border-collapse">
          <thead><tr class="text-left text-13px text-[#a6b5ab]"><th class="p-14px">平台模型</th><th>上游模型 ID</th><th>渠道</th><th>优先级 / 权重</th><th>健康度</th><th>状态</th><th class="pr-14px text-right">操作</th></tr></thead>
          <tbody>
            <tr v-if="deployments.isPending.value"><td colspan="7" class="p-8 text-center text-13px text-[#718078]">正在加载部署…</td></tr>
            <tr v-else-if="!deployments.data.value?.data.length"><td colspan="7" class="p-8 text-center text-13px text-[#718078]">暂无模型部署，未配置的模型继续使用兼容数据面默认映射。</td></tr>
            <tr v-for="item in deployments.data.value?.data" :key="item.id" class="border-t border-white/6 text-13px text-[#c3d0c7]">
              <td class="p-14px"><div class="flex items-center gap-3"><span class="h-8 w-8 grid place-items-center rounded-8px bg-emerald-300/8 text-emerald-300"><Boxes :size="16" /></span><div class="grid gap-1"><b class="text-white">{{ item.modelName }}</b><small class="text-[#6f7e74]">{{ item.modelPublicId }}</small></div></div></td>
              <td class="font-mono">{{ item.upstreamModelId }}</td><td>{{ item.channelName }} · {{ item.region }}</td><td>{{ item.priority }} / {{ item.weight }}</td>
              <td><span class="inline-flex items-center gap-1 text-[#91a097]"><Activity :size="14" />{{ statusLabel(item.healthStatus) }}</span></td>
              <td><button :class="['rounded-7px border-0 px-2 py-1 text-12px',item.enabled?'bg-emerald-300/8 text-emerald-300':'bg-white/4 text-[#7c8980]']" @click="deploymentMutation.mutate({item,enabled:!item.enabled})">{{ item.enabled?'参与路由':'已停用' }}</button></td>
              <td class="pr-14px text-right"><button class="h-8 w-8 inline-grid place-items-center rounded-8px border border-white/8 bg-transparent text-[#77867c] hover:text-red-300" aria-label="删除部署" @click="removeDeployment(item)"><Trash2 :size="15" /></button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>

  <div v-if="dialog" class="fixed inset-0 z-50 grid place-items-center bg-black/65 p-5 backdrop-blur-8px" @click.self="dialog=null">
    <form class="w-full max-w-520px rounded-18px border border-white/10 bg-[#0b1510] p-5 shadow-2xl" @submit.prevent="submit">
      <header class="mb-5 flex items-start justify-between"><div><small class="text-12px font-700 tracking-2px text-emerald-300">PROVIDER CONFIG</small><h2 class="mb-0 mt-2 text-22px">{{ dialog==='credential'?'新增供应商凭证':dialog==='channel'?'新增供应商渠道':'新增模型部署' }}</h2></div><button type="button" class="h-8 w-8 grid place-items-center rounded-8px border border-white/8 bg-transparent text-[#8d9b92]" @click="dialog=null"><X :size="17" /></button></header>
      <div v-if="dialog==='credential'" class="grid gap-4">
        <label class="grid gap-2 text-13px text-[#91a097]">凭证名称<input v-model="credentialForm.name" required maxlength="80" placeholder="OpenAI 生产主密钥" class="h-11 rounded-9px border border-white/9 bg-white/3 px-3 text-white outline-none focus:border-emerald-300/35"></label>
        <label class="grid gap-2 text-13px text-[#91a097]">供应商<select v-model="credentialForm.provider" required class="h-11 rounded-9px border border-white/9 bg-[#0f1a14] px-3 text-white outline-none"><option value="" disabled>请选择已启用供应商</option><option v-for="item in enabledProviders" :key="item.id" :value="item.code">{{ item.name }} · {{ item.code }}</option></select></label>
        <label class="grid gap-2 text-13px text-[#91a097]">环境<select v-model="credentialForm.environment" class="h-11 rounded-9px border border-white/9 bg-[#0f1a14] px-3 text-white outline-none"><option value="development">development</option><option value="staging">staging</option><option value="production">production</option></select></label>
        <label class="grid gap-2 text-13px text-[#91a097]">API Key<input v-model="credentialForm.apiKey" type="password" required minlength="8" maxlength="4096" autocomplete="new-password" placeholder="仅本次写入可见" class="h-11 rounded-9px border border-white/9 bg-white/3 px-3 font-mono text-white outline-none"></label>
      </div>
      <div v-else-if="dialog==='channel'" class="grid gap-4">
        <label class="grid gap-2 text-13px text-[#91a097]">渠道名称<input v-model="channelForm.name" required maxlength="80" placeholder="OpenAI 香港主渠道" class="h-11 rounded-9px border border-white/9 bg-white/3 px-3 text-white outline-none focus:border-emerald-300/35"></label>
        <label class="grid gap-2 text-13px text-[#91a097]">加密凭证<select v-model="channelForm.credentialId" required class="h-11 rounded-9px border border-white/9 bg-[#0f1a14] px-3 text-white outline-none"><option value="" disabled>请选择凭证</option><option v-for="item in credentials.data.value?.data" :key="item.id" :value="item.id" :disabled="!item.enabled">{{ item.provider }} · {{ item.name }} · {{ item.environment }}</option></select></label>
        <div class="grid grid-cols-2 gap-3"><label class="grid gap-2 text-13px text-[#91a097]">区域<input v-model="channelForm.region" required pattern="[a-z0-9][a-z0-9-]{1,39}" class="h-11 rounded-9px border border-white/9 bg-white/3 px-3 text-white outline-none"></label><label class="grid gap-2 text-13px text-[#91a097]">超时（毫秒）<input v-model.number="channelForm.timeoutMs" type="number" min="1000" max="300000" required class="h-11 rounded-9px border border-white/9 bg-white/3 px-3 text-white outline-none"></label></div>
        <label class="grid gap-2 text-13px text-[#91a097]">最大并发<input v-model.number="channelForm.maxConcurrency" type="number" min="1" max="100000" required class="h-11 rounded-9px border border-white/9 bg-white/3 px-3 text-white outline-none"></label>
      </div>
      <div v-else class="grid gap-4">
        <label class="grid gap-2 text-13px text-[#91a097]">平台模型<select v-model="deploymentForm.modelId" required class="h-11 rounded-9px border border-white/9 bg-[#0f1a14] px-3 text-white outline-none"><option v-for="item in models.data.value?.data" :key="item.id" :value="item.id">{{ item.name }} · {{ item.slug }}</option></select></label>
        <label class="grid gap-2 text-13px text-[#91a097]">供应商渠道<select v-model="deploymentForm.channelId" required class="h-11 rounded-9px border border-white/9 bg-[#0f1a14] px-3 text-white outline-none"><option v-for="item in enabledChannels" :key="item.id" :value="item.id">{{ item.name }} · {{ item.provider }} · {{ item.region }}</option></select></label>
        <label class="grid gap-2 text-13px text-[#91a097]">上游模型 ID<input v-model="deploymentForm.upstreamModelId" required maxlength="160" placeholder="gpt-4.1-mini" class="h-11 rounded-9px border border-white/9 bg-white/3 px-3 font-mono text-white outline-none"></label>
        <div class="grid grid-cols-2 gap-3"><label class="grid gap-2 text-13px text-[#91a097]">优先级<input v-model.number="deploymentForm.priority" type="number" min="1" max="10000" required class="h-11 rounded-9px border border-white/9 bg-white/3 px-3 text-white outline-none"></label><label class="grid gap-2 text-13px text-[#91a097]">权重<input v-model.number="deploymentForm.weight" type="number" min="1" max="10000" required class="h-11 rounded-9px border border-white/9 bg-white/3 px-3 text-white outline-none"></label></div>
      </div>
      <p v-if="errorMessage" class="mb-0 mt-4 text-13px text-red-300">{{ errorMessage }}</p>
      <footer class="mt-6 flex justify-end gap-3"><button type="button" class="h-10 rounded-9px border border-white/9 bg-transparent px-5 text-13px text-[#a5b3aa]" @click="dialog=null">取消</button><button class="h-10 rounded-9px border-0 bg-[#DCE7DE] px-5 text-13px font-700 text-[#07100a]" :disabled="createCredentialMutation.isPending.value||createChannelMutation.isPending.value||createDeploymentMutation.isPending.value">保存配置</button></footer>
    </form>
  </div>
</template>
