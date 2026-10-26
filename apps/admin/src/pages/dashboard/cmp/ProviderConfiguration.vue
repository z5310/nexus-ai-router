<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import AButton from 'ant-design-vue/es/button'
import AForm from 'ant-design-vue/es/form'
import AInput from 'ant-design-vue/es/input'
import AInputNumber from 'ant-design-vue/es/input-number'
import AInputPassword from 'ant-design-vue/es/input/Password'
import AModal from 'ant-design-vue/es/modal'
import ASelect, { SelectOption as ASelectOption } from 'ant-design-vue/es/select'
import ASwitch from 'ant-design-vue/es/switch'
import { computed, reactive, ref } from 'vue'
import { Activity, Boxes, KeyRound, LoaderCircle, PlugZap, Plus, ServerCog, Trash2 } from 'lucide-vue-next'
import type { ModelDeployment, ProviderChannel, ProviderCredential } from '../api'
import {
  acceptModelDeployment, createModelDeployment, createProviderChannel, createProviderCredential, deleteModelDeployment, deleteProviderChannel, deleteProviderCredential,
  getAdminModels, getModelDeployments, getProviderChannels, getProviderCredentials, getProviders,
  testModelDeployment, updateModelDeployment, updateProviderChannel, updateProviderCredential,
} from '../api'
import ProviderRegistry from './ProviderRegistry.vue'
import { DataSkeleton, feedback } from '@gateway/ui'

const queryClient = useQueryClient()
const dialog = ref<'credential' | 'channel' | 'deployment' | null>(null)
const errorMessage = ref('')
const successMessage = ref('')
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
  onSuccess: async () => { dialog.value = null; feedback.success('供应商凭证已创建'); await invalidate() },
  onError: (error) => { errorMessage.value = error.message; feedback.error(error, '供应商凭证创建失败') },
})

const createChannelMutation = useMutation({
  mutationFn: () => {
    const credential = selectedCredential.value
    if (!credential) throw new Error('请选择供应商凭证')
    return createProviderChannel({ ...channelForm, provider: credential.provider, environment: credential.environment, enabled: true })
  },
  onSuccess: async () => { dialog.value = null; feedback.success('供应商渠道已创建'); await invalidate() },
  onError: (error) => { errorMessage.value = error.message; feedback.error(error, '供应商渠道创建失败') },
})
const createDeploymentMutation = useMutation({
  mutationFn: () => createModelDeployment({ ...deploymentForm, enabled: true }),
  onSuccess: async () => { dialog.value = null; feedback.success('模型部署已创建'); await invalidate() },
  onError: (error) => { errorMessage.value = error.message; feedback.error(error, '模型部署创建失败') },
})
const channelMutation = useMutation({ mutationFn: ({ item, enabled }: { item: ProviderChannel; enabled: boolean }) => updateProviderChannel(item.id, { enabled }), onSuccess: invalidate })
const deploymentMutation = useMutation({ mutationFn: ({ item, enabled }: { item: ModelDeployment; enabled: boolean }) => updateModelDeployment(item.id, { enabled }), onSuccess: invalidate })
const credentialMutation = useMutation({ mutationFn: ({ item, enabled }: { item: ProviderCredential; enabled: boolean }) => updateProviderCredential(item.id, { enabled }), onSuccess: invalidate, onError: (error) => { errorMessage.value = error.message } })
const removeCredentialMutation = useMutation({ mutationFn: deleteProviderCredential, onSuccess: invalidate, onError: (error) => { errorMessage.value = error.message } })
const removeChannelMutation = useMutation({ mutationFn: deleteProviderChannel, onSuccess: invalidate, onError: (error) => { errorMessage.value = error.message } })
const removeDeploymentMutation = useMutation({ mutationFn: deleteModelDeployment, onSuccess: invalidate, onError: (error) => { errorMessage.value = error.message } })
const testDeploymentMutation = useMutation({
  mutationFn: testModelDeployment,
  onMutate: () => { errorMessage.value = ''; successMessage.value = '' },
  onSuccess: async (result) => {
    successMessage.value = `${result.provider} / ${result.upstreamModelId} 连接正常，${result.latencyMs}ms`
    feedback.success('供应商连接测试通过', successMessage.value)
    await invalidate()
  },
  onError: (error) => { errorMessage.value = error.message; feedback.error(error, '供应商连接测试失败') },
})
const acceptDeploymentMutation = useMutation({
  mutationFn: acceptModelDeployment,
  onMutate: () => { errorMessage.value = ''; successMessage.value = '' },
  onSuccess: async (result) => {
    successMessage.value = `${result.provider} 真实验收通过：JSON ${result.jsonCompletion.latencyMs}ms，SSE 首 Token ${result.streamCompletion.firstTokenLatencyMs}ms，取消已传播`
    feedback.success('供应商真实验收通过', successMessage.value)
    await invalidate()
  },
  onError: (error) => { errorMessage.value = error.message; feedback.error(error, '供应商真实验收失败') },
})

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
  AModal.confirm({ title: '删除供应商渠道', content: `确认删除渠道“${item.name}”？`, okText: '删除', cancelText: '取消', okType: 'danger', onOk: () => removeChannelMutation.mutateAsync(item.id) })
}
function removeCredential(item: ProviderCredential) {
  AModal.confirm({ title: '删除供应商凭证', content: `确认删除凭证“${item.name}”？`, okText: '删除', cancelText: '取消', okType: 'danger', onOk: () => removeCredentialMutation.mutateAsync(item.id) })
}
function removeDeployment(item: ModelDeployment) {
  AModal.confirm({ title: '删除模型部署', content: `确认删除 ${item.modelName} 的部署？`, okText: '删除', cancelText: '取消', okType: 'danger', onOk: () => removeDeploymentMutation.mutateAsync(item.id) })
}
</script>

<template>
  <div class="mt-6 grid gap-4">
    <p v-if="errorMessage" class="m-0 rounded-2 border border-red-400/20 bg-red-400/8 px-4 py-3 text-13px text-red-300">{{ errorMessage }}</p>
    <p v-if="successMessage" class="m-0 rounded-2 border border-emerald-300/20 bg-emerald-300/8 px-4 py-3 text-13px text-emerald-200">{{ successMessage }}</p>
    <ProviderRegistry />
    <section class="overflow-hidden rounded-14px border border-white/9 bg-white/2">
      <header class="min-h-68px flex items-center justify-between gap-4 border-b border-white/7 px-18px py-4">
        <div><h2 class="m-0 text-15px">供应商凭证</h2><p class="mb-0 mt-1 text-13px text-[#647268]">密钥写入后立即加密，页面只显示名称、环境和末四位。</p></div>
        <AButton type="primary" class="h-36px flex items-center gap-2 px-4" @click="open('credential')"><Plus :size="15" />新增凭证</AButton>
      </header>
      <div class="overflow-x-auto"><table class="w-full min-w-760px border-collapse">
        <thead><tr class="text-left text-13px text-[#a6b5ab]"><th class="p-14px">名称</th><th>供应商</th><th>环境</th><th>密钥</th><th>轮换时间</th><th>状态</th><th class="pr-14px text-right">操作</th></tr></thead>
        <tbody>
          <tr v-if="credentials.isPending.value"><td colspan="7" class="p-4"><DataSkeleton compact :rows="3" label="正在加载供应商凭证" /></td></tr>
          <tr v-else-if="!credentials.data.value?.data.length"><td colspan="7" class="p-8 text-center text-13px text-[#718078]">尚未配置供应商凭证。</td></tr>
          <tr v-for="item in credentials.data.value?.data" :key="item.id" class="border-t border-white/6 text-13px text-[#c3d0c7]">
            <td class="p-14px"><div class="flex items-center gap-3"><span class="h-8 w-8 grid place-items-center rounded-8px bg-emerald-300/8 text-emerald-300"><KeyRound :size="16" /></span><b class="text-white">{{ item.name }}</b></div></td>
            <td>{{ item.provider }}</td><td>{{ item.environment }}</td><td class="font-mono">{{ item.maskedKey }}</td><td>{{ new Date(item.rotatedAt).toLocaleDateString('zh-CN') }}</td>
            <td><ASwitch :checked="item.enabled" checked-children="启用" un-checked-children="停用" @change="(enabled) => credentialMutation.mutate({item, enabled: Boolean(enabled)})" /></td>
            <td class="pr-14px text-right"><AButton type="text" danger aria-label="删除凭证" @click="removeCredential(item)"><Trash2 :size="15" /></AButton></td>
          </tr>
        </tbody>
      </table></div>
    </section>
    <section class="overflow-hidden rounded-14px border border-white/9 bg-white/2">
      <header class="min-h-68px flex items-center justify-between gap-4 border-b border-white/7 px-18px py-4">
        <div><h2 class="m-0 text-15px">供应商渠道</h2><p class="mb-0 mt-1 text-13px text-[#647268]">绑定加密凭证、环境、区域与渠道级可靠性参数。</p></div>
        <AButton type="primary" class="h-36px flex items-center gap-2 px-4" @click="open('channel')"><Plus :size="15" />新增渠道</AButton>
      </header>
      <div class="overflow-x-auto">
        <table class="w-full min-w-900px border-collapse">
          <thead><tr class="text-left text-13px text-[#a6b5ab]"><th class="p-14px">渠道</th><th>环境 / 区域</th><th>凭证</th><th>健康度</th><th>超时 / 并发</th><th>状态</th><th class="pr-14px text-right">操作</th></tr></thead>
          <tbody>
            <tr v-if="channels.isPending.value"><td colspan="7" class="p-4"><DataSkeleton compact :rows="3" label="正在加载供应商渠道" /></td></tr>
            <tr v-else-if="!channels.data.value?.data.length"><td colspan="7" class="p-8 text-center text-13px text-[#718078]">尚未配置渠道，请先创建供应商凭证，再新增渠道。</td></tr>
            <tr v-for="item in channels.data.value?.data" :key="item.id" class="border-t border-white/6 text-13px text-[#c3d0c7]">
              <td class="p-14px"><div class="flex items-center gap-3"><span class="h-8 w-8 grid place-items-center rounded-8px bg-emerald-300/8 text-emerald-300"><ServerCog :size="16" /></span><div class="grid gap-1"><b class="text-white">{{ item.name }}</b><small class="text-[#6f7e74]">{{ item.provider }}</small></div></div></td>
              <td>{{ item.environment }} / {{ item.region }}</td><td>{{ item.credentialName }} · {{ item.credentialMaskedKey }}</td>
              <td><span :class="['rounded-full px-2 py-1 text-12px', item.healthStatus==='healthy'?'bg-emerald-300/8 text-emerald-300':item.healthStatus==='unhealthy'?'bg-red-400/8 text-red-300':'bg-amber-300/8 text-amber-200']">{{ statusLabel(item.healthStatus) }}<template v-if="item.consecutiveFailures"> · {{ item.consecutiveFailures }}</template></span></td>
              <td>{{ item.timeoutMs / 1000 }}s / {{ item.maxConcurrency }}</td>
              <td><ASwitch :checked="item.enabled" checked-children="启用" un-checked-children="停用" @change="(enabled) => channelMutation.mutate({item, enabled: Boolean(enabled)})" /></td>
              <td class="pr-14px text-right"><AButton type="text" danger aria-label="删除渠道" @click="removeChannel(item)"><Trash2 :size="15" /></AButton></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="overflow-hidden rounded-14px border border-white/9 bg-white/2">
      <header class="min-h-68px flex items-center justify-between gap-4 border-b border-white/7 px-18px py-4">
        <div><h2 class="m-0 text-15px">模型部署</h2><p class="mb-0 mt-1 text-13px text-[#647268]">将公开模型映射到具体渠道和上游模型 ID，路由按健康度与优先级选择。</p></div>
        <AButton type="primary" class="h-36px flex items-center gap-2 px-4" @click="open('deployment')"><Plus :size="15" />新增部署</AButton>
      </header>
      <div class="overflow-x-auto">
        <table class="w-full min-w-900px border-collapse">
          <thead><tr class="text-left text-13px text-[#a6b5ab]"><th class="p-14px">平台模型</th><th>上游模型 ID</th><th>渠道</th><th>优先级 / 权重</th><th>健康度</th><th>状态</th><th class="pr-14px text-right">操作</th></tr></thead>
          <tbody>
            <tr v-if="deployments.isPending.value"><td colspan="7" class="p-4"><DataSkeleton compact :rows="3" label="正在加载模型部署" /></td></tr>
            <tr v-else-if="!deployments.data.value?.data.length"><td colspan="7" class="p-8 text-center text-13px text-[#718078]">暂无模型部署，未配置的模型继续使用兼容数据面默认映射。</td></tr>
            <tr v-for="item in deployments.data.value?.data" :key="item.id" class="border-t border-white/6 text-13px text-[#c3d0c7]">
              <td class="p-14px"><div class="flex items-center gap-3"><span class="h-8 w-8 grid place-items-center rounded-8px bg-emerald-300/8 text-emerald-300"><Boxes :size="16" /></span><div class="grid gap-1"><b class="text-white">{{ item.modelName }}</b><small class="text-[#6f7e74]">{{ item.modelPublicId }}</small></div></div></td>
              <td class="font-mono">{{ item.upstreamModelId }}</td><td>{{ item.channelName }} · {{ item.region }}</td><td>{{ item.priority }} / {{ item.weight }}</td>
              <td><span class="inline-flex items-center gap-1 text-[#91a097]"><Activity :size="14" />{{ statusLabel(item.healthStatus) }}</span></td>
              <td><ASwitch :checked="item.enabled" checked-children="路由" un-checked-children="停用" @change="(enabled) => deploymentMutation.mutate({item, enabled: Boolean(enabled)})" /></td>
              <td class="pr-14px text-right"><div class="inline-flex items-center gap-2"><AButton class="h-8 flex items-center gap-1.5 px-3 text-12px" :disabled="testDeploymentMutation.isPending.value || acceptDeploymentMutation.isPending.value" @click="testDeploymentMutation.mutate(item.id)"><LoaderCircle v-if="testDeploymentMutation.isPending.value && testDeploymentMutation.variables.value===item.id" :size="14" class="animate-spin" /><PlugZap v-else :size="14" />连接检查</AButton><AButton type="primary" class="h-8 px-3 text-12px" :loading="acceptDeploymentMutation.isPending.value && acceptDeploymentMutation.variables.value===item.id" :disabled="testDeploymentMutation.isPending.value || acceptDeploymentMutation.isPending.value" @click="acceptDeploymentMutation.mutate(item.id)">真实验收</AButton><AButton type="text" danger aria-label="删除部署" @click="removeDeployment(item)"><Trash2 :size="15" /></AButton></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>

  <AModal :open="Boolean(dialog)" :title="dialog==='credential'?'新增供应商凭证':dialog==='channel'?'新增供应商渠道':'新增模型部署'" :footer="null" width="520px" @cancel="dialog=null">
    <AForm class="grid gap-4" @finish="submit">
      <div v-if="dialog==='credential'" class="grid gap-4">
        <label class="grid gap-2 text-13px text-[#91a097]">凭证名称<AInput v-model:value="credentialForm.name" required :maxlength="80" placeholder="OpenAI 生产主密钥" /></label>
        <label class="grid gap-2 text-13px text-[#91a097]">供应商<ASelect v-model:value="credentialForm.provider" placeholder="请选择已启用供应商"><ASelectOption v-for="item in enabledProviders" :key="item.id" :value="item.code">{{ item.name }} · {{ item.code }}</ASelectOption></ASelect></label>
        <label class="grid gap-2 text-13px text-[#91a097]">环境<ASelect v-model:value="credentialForm.environment"><ASelectOption value="development">development</ASelectOption><ASelectOption value="staging">staging</ASelectOption><ASelectOption value="production">production</ASelectOption></ASelect></label>
        <label class="grid gap-2 text-13px text-[#91a097]">API Key<AInputPassword v-model:value="credentialForm.apiKey" required :maxlength="4096" autocomplete="new-password" placeholder="仅本次写入可见" /></label>
      </div>
      <div v-else-if="dialog==='channel'" class="grid gap-4">
        <label class="grid gap-2 text-13px text-[#91a097]">渠道名称<AInput v-model:value="channelForm.name" required :maxlength="80" placeholder="OpenAI 香港主渠道" /></label>
        <label class="grid gap-2 text-13px text-[#91a097]">加密凭证<ASelect v-model:value="channelForm.credentialId" placeholder="请选择凭证"><ASelectOption v-for="item in credentials.data.value?.data" :key="item.id" :value="item.id" :disabled="!item.enabled">{{ item.provider }} · {{ item.name }} · {{ item.environment }}</ASelectOption></ASelect></label>
        <div class="grid grid-cols-2 gap-3"><label class="grid gap-2 text-13px text-[#91a097]">区域<AInput v-model:value="channelForm.region" required /></label><label class="grid gap-2 text-13px text-[#91a097]">超时（毫秒）<AInputNumber v-model:value="channelForm.timeoutMs" :min="1000" :max="300000" class="w-full" /></label></div>
        <label class="grid gap-2 text-13px text-[#91a097]">最大并发<AInputNumber v-model:value="channelForm.maxConcurrency" :min="1" :max="100000" class="w-full" /></label>
      </div>
      <div v-else class="grid gap-4">
        <label class="grid gap-2 text-13px text-[#91a097]">平台模型<ASelect v-model:value="deploymentForm.modelId"><ASelectOption v-for="item in models.data.value?.data" :key="item.id" :value="item.id">{{ item.name }} · {{ item.slug }}</ASelectOption></ASelect></label>
        <label class="grid gap-2 text-13px text-[#91a097]">供应商渠道<ASelect v-model:value="deploymentForm.channelId"><ASelectOption v-for="item in enabledChannels" :key="item.id" :value="item.id">{{ item.name }} · {{ item.provider }} · {{ item.region }}</ASelectOption></ASelect></label>
        <label class="grid gap-2 text-13px text-[#91a097]">上游模型 ID<AInput v-model:value="deploymentForm.upstreamModelId" required :maxlength="160" placeholder="gpt-4.1-mini" /></label>
        <div class="grid grid-cols-2 gap-3"><label class="grid gap-2 text-13px text-[#91a097]">优先级<AInputNumber v-model:value="deploymentForm.priority" :min="1" :max="10000" class="w-full" /></label><label class="grid gap-2 text-13px text-[#91a097]">权重<AInputNumber v-model:value="deploymentForm.weight" :min="1" :max="10000" class="w-full" /></label></div>
      </div>
      <p v-if="errorMessage" class="mb-0 mt-4 text-13px text-red-300">{{ errorMessage }}</p>
      <footer class="mt-6 flex justify-end gap-3"><AButton @click="dialog=null">取消</AButton><AButton type="primary" html-type="submit" :loading="createCredentialMutation.isPending.value||createChannelMutation.isPending.value||createDeploymentMutation.isPending.value">保存配置</AButton></footer>
    </AForm>
  </AModal>
</template>
