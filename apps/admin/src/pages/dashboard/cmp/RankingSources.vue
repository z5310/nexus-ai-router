<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import AButton from 'ant-design-vue/es/button'
import AForm from 'ant-design-vue/es/form'
import AInput from 'ant-design-vue/es/input'
import AInputNumber from 'ant-design-vue/es/input-number'
import AModal from 'ant-design-vue/es/modal'
import ASelect, { SelectOption as ASelectOption } from 'ant-design-vue/es/select'
import ASwitch from 'ant-design-vue/es/switch'
import { computed, reactive, ref, watchEffect } from 'vue'
import { CheckCircle2, DatabaseZap, ExternalLink, Link2, Plus, RefreshCw } from 'lucide-vue-next'
import type { RankingMetric, RankingSourceSnapshot } from '@gateway/contracts'
import {
  createRankingSource, getAdminModels, getRankingSource, getRankingSources, mapRankingModel,
  syncRankingSource, unmapRankingModel, updateRankingSource,
} from '../api'
import { DataSkeleton, feedback } from '@gateway/ui'

const queryClient = useQueryClient()
const selectedId = ref('')
const dialog = ref(false)
const errorMessage = ref('')
const sources = useQuery({ queryKey: ['admin-ranking-sources'], queryFn: getRankingSources })
const models = useQuery({ queryKey: ['admin-models-for-ranking'], queryFn: () => getAdminModels({ page: 1, pageSize: 100 }) })
watchEffect(() => { if (!selectedId.value && sources.data.value?.data[0]) selectedId.value = sources.data.value.data[0].id })
const detail = useQuery({
  queryKey: computed(() => ['admin-ranking-source', selectedId.value]),
  queryFn: () => getRankingSource(selectedId.value),
  enabled: computed(() => Boolean(selectedId.value)),
})
const form = reactive({
  code: '', name: '', adapter: 'huggingface' as const, datasetId: '', metric: 'overall' as RankingMetric,
  scoreMultiplier: 1, priority: 100, enabled: false, attributionLabel: '',
})
const metricLabels: Record<RankingMetric, string> = { overall: '综合能力', coding: '编码能力', cost: '成本效率', speed: '响应速度' }
const fail = (error: Error, title: string) => { errorMessage.value = error.message; feedback.error(error, title) }

const invalidate = async () => Promise.all([
  queryClient.invalidateQueries({ queryKey: ['admin-ranking-sources'] }),
  queryClient.invalidateQueries({ queryKey: ['admin-ranking-source', selectedId.value] }),
])
const createMutation = useMutation({
  mutationFn: () => createRankingSource(form),
  onSuccess: async (source) => { selectedId.value = source.id; dialog.value = false; feedback.success('排行榜数据源已创建'); await invalidate() },
  onError: (error) => fail(error, '排行榜数据源创建失败'),
})
const toggleMutation = useMutation({
  mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => updateRankingSource(id, { enabled }),
  onSuccess: async () => { feedback.success('数据源状态已更新'); await invalidate() }, onError: (error) => fail(error, '数据源状态更新失败'),
})
const syncMutation = useMutation({
  mutationFn: syncRankingSource,
  onSuccess: async () => { feedback.success('排行榜数据已同步'); await invalidate() }, onError: (error) => fail(error, '排行榜数据同步失败'),
})
const mapMutation = useMutation({
  mutationFn: ({ externalModelId, modelId }: { externalModelId: string; modelId: string }) => mapRankingModel(selectedId.value, { externalModelId, modelId }),
  onSuccess: async () => { feedback.success('外部模型映射已保存'); await invalidate() }, onError: (error) => fail(error, '模型映射保存失败'),
})
const unmapMutation = useMutation({
  mutationFn: unmapRankingModel,
  onSuccess: async () => { feedback.success('外部模型映射已移除'); await invalidate() }, onError: (error) => fail(error, '模型映射移除失败'),
})

function openCreate() {
  errorMessage.value = ''
  Object.assign(form, { code: '', name: '', adapter: 'huggingface', datasetId: '', metric: 'overall', scoreMultiplier: 1, priority: 100, enabled: false, attributionLabel: '' })
  dialog.value = true
}
function changeMapping(item: RankingSourceSnapshot, value: unknown) {
  const modelId = String(value ?? '')
  if (!modelId && item.mappingId) unmapMutation.mutate(item.mappingId)
  else if (modelId) mapMutation.mutate({ externalModelId: item.externalModelId, modelId })
}
function date(value: string | null) { return value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '尚未同步' }
</script>

<template>
  <div class="grid gap-4">
    <p v-if="errorMessage" class="m-0 rounded-2 border border-red-400/20 bg-red-400/8 px-4 py-3 text-13px text-red-300">{{ errorMessage }}</p>
    <section class="overflow-hidden rounded-14px border border-white/9 bg-white/2">
      <header class="min-h-68px flex items-center justify-between gap-4 border-b border-white/7 px-18px py-4">
        <div><h2 class="m-0 text-15px">排行榜数据源</h2><p class="mb-0 mt-1 text-13px text-[#647268]">后端定期保存可信快照，公开接口只读取本地数据，不在用户请求时访问第三方。</p></div>
        <AButton type="primary" class="h-36px flex items-center gap-2 px-4" @click="openCreate"><Plus :size="15" />新增来源</AButton>
      </header>
      <div class="overflow-x-auto"><table class="w-full min-w-900px border-collapse">
        <thead><tr class="text-left text-13px text-[#a6b5ab]"><th class="p-14px">来源</th><th>数据集</th><th>指标</th><th>快照 / 映射</th><th>最近同步</th><th>状态</th><th class="pr-14px text-right">操作</th></tr></thead>
        <tbody>
          <tr v-if="sources.isPending.value"><td colspan="7" class="p-4"><DataSkeleton compact :rows="3" label="正在加载排行榜数据源" /></td></tr>
          <tr v-for="item in sources.data.value?.data" :key="item.id" :class="['cursor-pointer border-t border-white/6 text-13px text-[#c3d0c7]',selectedId===item.id?'bg-emerald-300/4':'']" @click="selectedId=item.id">
            <td class="p-14px"><div class="flex items-center gap-3"><span class="h-8 w-8 grid place-items-center rounded-8px bg-emerald-300/8 text-emerald-300"><DatabaseZap :size="16" /></span><div class="grid gap-1"><b class="text-white">{{ item.name }}</b><small class="font-mono text-[#6f7e74]">{{ item.code }}</small></div></div></td>
            <td><a :href="item.sourceUrl" target="_blank" rel="noreferrer" class="inline-flex items-center gap-1 text-[#91a097] no-underline hover:text-emerald-300" @click.stop>{{ item.datasetId }}<ExternalLink :size="12" /></a></td>
            <td>{{ metricLabels[item.metric] }} · ×{{ item.scoreMultiplier }}</td><td>{{ item.snapshotCount }} / {{ item.mappingCount }}</td>
            <td><div class="grid gap-1"><span>{{ date(item.lastSuccessAt) }}</span><small v-if="item.lastError" class="max-w-260px truncate text-red-300">{{ item.lastError }}</small></div></td>
            <td><ASwitch :checked="item.enabled" checked-children="参与" un-checked-children="停用" @click.stop @change="(enabled) => toggleMutation.mutate({id:item.id,enabled:Boolean(enabled)})" /></td>
            <td class="pr-14px text-right"><AButton :loading="syncMutation.isPending.value" @click.stop="syncMutation.mutate(item.id)"><RefreshCw :size="14" />同步</AButton></td>
          </tr>
        </tbody>
      </table></div>
    </section>

    <section v-if="selectedId" class="overflow-hidden rounded-14px border border-white/9 bg-white/2">
      <header class="min-h-68px flex items-center justify-between gap-4 border-b border-white/7 px-18px py-4"><div><h2 class="m-0 text-15px">外部模型映射</h2><p class="mb-0 mt-1 text-13px text-[#647268]">必须由管理员确认外部模型与平台模型的对应关系，系统不会按模糊名称自动绑定。</p></div><span class="text-12px text-[#647268]">{{ detail.data.value?.source.attributionLabel }}</span></header>
      <div v-if="detail.isPending.value" class="p-4"><DataSkeleton compact :rows="5" label="正在加载排行榜快照" /></div>
      <div v-else-if="!detail.data.value?.snapshots.length" class="p-8 text-center text-13px text-[#718078]">暂无快照，请先点击同步。来源默认关闭，不会影响公开排行榜。</div>
      <div v-else class="max-h-560px overflow-auto"><table class="w-full min-w-800px border-collapse">
        <thead class="bg-[#0c1610]"><tr class="text-left text-13px text-[#a6b5ab]"><th class="p-14px">外部排名</th><th>外部模型</th><th>原始分 / 归一化</th><th>验证</th><th>平台模型映射</th></tr></thead>
        <tbody><tr v-for="item in detail.data.value?.snapshots" :key="item.externalModelId" class="border-t border-white/6 text-13px text-[#c3d0c7]"><td class="p-14px font-700">#{{ item.rank }}</td><td><div class="grid gap-1"><b class="text-white">{{ item.externalModelId }}</b><small class="text-[#647268]">{{ item.author || '未知提交者' }}</small></div></td><td>{{ item.rawScore }} / <b class="text-emerald-300">{{ item.normalizedScore }}</b></td><td><span :class="item.verified?'text-emerald-300':'text-[#647268]'" class="inline-flex items-center gap-1"><CheckCircle2 :size="14" />{{ item.verified?'已验证':'未验证' }}</span></td><td><label class="relative inline-flex items-center"><Link2 :size="14" class="pointer-events-none absolute left-3 z-1 text-[#718078]" /><ASelect :value="item.mappedModelId || ''" class="min-w-260px pl-6" @change="(value) => changeMapping(item,value)"><ASelectOption value="">不映射</ASelectOption><ASelectOption v-for="model in models.data.value?.data" :key="model.id" :value="model.id">{{ model.name }} · {{ model.slug }}</ASelectOption></ASelect></label></td></tr></tbody>
      </table></div>
    </section>
  </div>

  <AModal :open="dialog" title="新增公开榜单来源" :footer="null" width="560px" @cancel="dialog=false"><AForm class="grid gap-4" @finish="createMutation.mutate()"><div class="grid gap-4"><div class="grid grid-cols-2 gap-3"><label class="grid gap-2 text-13px text-[#91a097]">名称<AInput v-model:value="form.name" required :maxlength="100" placeholder="HLE 官方榜单" /></label><label class="grid gap-2 text-13px text-[#91a097]">唯一标识<AInput v-model:value="form.code" required placeholder="hle-official" /></label></div><label class="grid gap-2 text-13px text-[#91a097]">Hugging Face 数据集<AInput v-model:value="form.datasetId" required placeholder="cais/hle" /></label><div class="grid grid-cols-3 gap-3"><label class="grid gap-2 text-13px text-[#91a097]">指标<ASelect v-model:value="form.metric"><ASelectOption value="overall">综合能力</ASelectOption><ASelectOption value="coding">编码能力</ASelectOption><ASelectOption value="cost">成本效率</ASelectOption><ASelectOption value="speed">响应速度</ASelectOption></ASelect></label><label class="grid gap-2 text-13px text-[#91a097]">分数倍率<AInputNumber v-model:value="form.scoreMultiplier" :min="0.0001" :max="1000" :step="0.0001" class="w-full" /></label><label class="grid gap-2 text-13px text-[#91a097]">优先级<AInputNumber v-model:value="form.priority" :min="0" :max="10000" class="w-full" /></label></div><label class="grid gap-2 text-13px text-[#91a097]">来源署名<AInput v-model:value="form.attributionLabel" required :maxlength="120" placeholder="Hugging Face · HLE" /></label><label class="flex items-center gap-3 text-13px text-[#91a097]"><ASwitch v-model:checked="form.enabled" />创建后立即参与公开排行榜</label></div><p v-if="errorMessage" class="mb-0 mt-4 text-13px text-red-300">{{ errorMessage }}</p><footer class="mt-6 flex justify-end gap-3"><AButton @click="dialog=false">取消</AButton><AButton type="primary" html-type="submit" :loading="createMutation.isPending.value">保存来源</AButton></footer></AForm></AModal>
</template>
