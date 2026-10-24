<script setup lang="ts">
import { Check, Copy, KeyRound } from 'lucide-vue-next'
import AButton from 'ant-design-vue/es/button'
import AInput from 'ant-design-vue/es/input'
import { ref, watch } from 'vue'
import ModalShell from './ModalShell.vue'

const props = defineProps<{ open: boolean; busy: boolean; secret?: string; error?: string }>()
const emit = defineEmits<{ close: []; submit: [name: string] }>()
const name = ref('')
const copied = ref(false)
watch(() => props.open, (open) => { if (open) { name.value = ''; copied.value = false } })
async function copySecret() { if (!props.secret) return; await navigator.clipboard.writeText(props.secret); copied.value = true }
</script>

<template>
  <ModalShell v-if="open" :title="secret ? 'API 密钥创建成功' : '创建 API 密钥'" :description="secret ? '请立即复制保存，关闭后将无法再次查看完整密钥。' : '给密钥设置一个容易识别的名称，便于后续审计和撤销。'" :busy="busy" @close="emit('close')">
    <div v-if="secret" class="flex flex-col gap-3.5 px-[22px] pb-[22px] pt-[21px]">
      <span class="flex items-center gap-1.75 text-[11px] text-[#8ce5aa]"><KeyRound :size="18" /> 仅显示一次</span>
      <code class="overflow-wrap-anywhere rounded-2.5 border border-[rgba(99,228,149,.15)] bg-[#09110c] p-3.75 text-xs leading-[1.6] text-[#dff2e5]">{{ secret }}</code>
      <AButton class="self-end" @click="copySecret"><Check v-if="copied" :size="16" /><Copy v-else :size="16" />{{ copied ? '已复制' : '复制密钥' }}</AButton>
    </div>
    <form v-else class="px-[22px] pb-[22px] pt-[21px]" @submit.prevent="emit('submit', name)">
      <label class="flex flex-col gap-2 text-[11px] text-[#9caaa1]">密钥名称<AInput v-model:value="name" class="!h-11 text-[13px]" minlength="2" :maxlength="80" autofocus placeholder="例如：生产环境、后端服务" /></label>
      <p v-if="error" class="mb-0 mt-2.5 text-[10px] text-[#ef9292]">{{ error }}</p>
      <footer class="mt-[22px] flex justify-end gap-2.25"><AButton ghost :disabled="busy" @click="emit('close')">取消</AButton><AButton html-type="submit" :loading="busy" :disabled="name.trim().length < 2"><KeyRound :size="16" />{{ busy ? '正在创建…' : '创建密钥' }}</AButton></footer>
    </form>
  </ModalShell>
</template>
