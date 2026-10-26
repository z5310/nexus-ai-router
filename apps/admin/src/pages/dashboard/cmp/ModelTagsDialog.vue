<script setup lang="ts">
import { useMutation } from '@tanstack/vue-query'
import { ref } from 'vue'
import { Tag, X } from 'lucide-vue-next'
import AButton from 'ant-design-vue/es/button'
import AForm from 'ant-design-vue/es/form'
import AInput from 'ant-design-vue/es/input'
import AModal from 'ant-design-vue/es/modal'
import type { AdminModel } from '../api'
import { updateAdminModel } from '../api'

const props = defineProps<{ model: AdminModel }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const tags = ref([...props.model.tags])
const draft = ref('')
const validationError = ref('')
const mutation = useMutation({
  mutationFn: () => updateAdminModel(props.model.id, { tags: tags.value }),
  onSuccess: () => emit('saved'),
})

const label = (tag: string) => ({
  'tags.new': '新上线',
  'tags.hot': '热门',
  'tags.lowLatency': '低延迟',
  'tags.value': '高性价比',
  'tags.creator': '创作者优选',
}[tag] ?? tag)

function addDraft() {
  const candidates = draft.value.split(/[,，]/).map((item) => item.trim()).filter(Boolean)
  if (!candidates.length) return true
  if (candidates.some((item) => item.length > 24)) {
    validationError.value = '单个标签不能超过 24 个字符。'
    return false
  }
  const next = [...new Set([...tags.value, ...candidates])]
  if (next.length > 8) {
    validationError.value = '每个模型最多配置 8 个标签。'
    return false
  }
  tags.value = next
  draft.value = ''
  validationError.value = ''
  return true
}

function onDraftKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ',') return
  event.preventDefault()
  addDraft()
}

function submit() {
  if (!addDraft()) return
  mutation.mutate()
}
</script>

<template>
  <AModal :open="true" :footer="null" :closable="false" :width="576" wrap-class-name="nexus-admin-modal" @cancel="emit('close')">
      <AForm class="text-[#dce7de]" @finish="submit">
        <header class="flex items-start justify-between border-b border-white/8 px-6 py-5">
          <div class="flex gap-3">
            <span class="grid h-10 w-10 place-items-center rounded-3 bg-emerald/10 text-[#75e69d]"><Tag :size="20" /></span>
            <div><h2 class="m-0 text-lg font-650">配置模型标签</h2><p class="mt-1 text-xs text-[#718078]">{{ model.name }} · 最多 8 个标签</p></div>
          </div>
          <AButton type="text" class="grid h-8 w-8 place-items-center p-0 text-[#87958c]" aria-label="关闭" @click="emit('close')"><X :size="17" /></AButton>
        </header>

        <div class="grid gap-5 p-6">
          <label class="grid gap-2 text-xs text-[#96a39a]">新增标签
            <div class="flex gap-2"><AInput v-model:value="draft" :maxlength="120" placeholder="输入标签，按回车或逗号添加" class="h-11 min-w-0 flex-1 text-sm" @keydown="onDraftKeydown" /><AButton ghost class="h-11 px-4 text-sm" @click="addDraft">添加</AButton></div>
          </label>
          <div class="min-h-28 rounded-3 border border-white/8 bg-white/2 p-4">
            <p v-if="!tags.length" class="m-0 text-sm text-[#65736a]">暂未配置标签，官网模型卡片将不展示标签。</p>
            <div v-else class="flex flex-wrap gap-2"><span v-for="tag in tags" :key="tag" class="inline-flex items-center gap-2 rounded-full border border-[#63e495]/18 bg-[#63e495]/8 px-3 py-2 text-xs text-[#a8efbd]">{{ label(tag) }}<AButton type="text" class="grid h-4 w-4 place-items-center p-0 text-[#718078] hover:text-white" :aria-label="`删除 ${label(tag)}`" @click="tags=tags.filter((item)=>item!==tag)"><X :size="13" /></AButton></span></div>
          </div>
          <p class="m-0 text-xs leading-5 text-[#65736a]">标签保存后由模型目录接口返回，官网会按后台配置顺序展示。系统内置标签会自动使用当前语言翻译。</p>
          <p v-if="validationError || mutation.isError.value" class="m-0 rounded-2 bg-red/8 px-3 py-2 text-xs text-[#e99595]">{{ validationError || mutation.error.value?.message }}</p>
          <div class="flex justify-end gap-2"><AButton ghost class="h-10 px-4 text-sm" @click="emit('close')">取消</AButton><AButton html-type="submit" :loading="mutation.isPending.value" class="h-10 px-5 text-sm font-700">保存标签</AButton></div>
        </div>
      </AForm>
  </AModal>
</template>
