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
    <div v-if="secret" class="key-result">
      <span><KeyRound :size="18" /> 仅显示一次</span>
      <code>{{ secret }}</code>
      <AButton class="white-action" @click="copySecret"><Check v-if="copied" :size="16" /><Copy v-else :size="16" />{{ copied ? '已复制' : '复制密钥' }}</AButton>
    </div>
    <form v-else class="modal-form" @submit.prevent="emit('submit', name)">
      <label>密钥名称<AInput v-model:value="name" minlength="2" :maxlength="80" autofocus placeholder="例如：生产环境、后端服务" /></label>
      <p v-if="error" class="form-error">{{ error }}</p>
      <footer><AButton ghost :disabled="busy" @click="emit('close')">取消</AButton><AButton html-type="submit" :loading="busy" :disabled="name.trim().length < 2"><KeyRound :size="16" />{{ busy ? '正在创建…' : '创建密钥' }}</AButton></footer>
    </form>
  </ModalShell>
</template>

<style scoped>
.modal-form,.key-result { padding: 21px 22px 22px; }.modal-form label { display: flex; flex-direction: column; gap: 8px; color: #9caaa1; font-size: 11px; }.modal-form :deep(.ant-input) { height: 44px; font-size: 13px; }.modal-form footer { display: flex; justify-content: flex-end; gap: 9px; margin-top: 22px; }
.white-action,.ghost-action { min-height: 40px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 15px; border-radius: 9px; font-size: 11px; font-weight: 700; }.white-action { color: #08110b; border: 0; background: var(--nexus-button); }.white-action:disabled { opacity: .45; }.ghost-action { color: #9aa79e; border: 1px solid rgba(255,255,255,.09); background: transparent; }.form-error { margin: 10px 0 0; color: #ef9292; font-size: 10px; }
.key-result { display: flex; flex-direction: column; gap: 14px; }.key-result > span { display: flex; align-items: center; gap: 7px; color: #8ce5aa; font-size: 11px; }.key-result code { padding: 15px; overflow-wrap: anywhere; color: #dff2e5; border: 1px solid rgba(99,228,149,.15); border-radius: 10px; background: #09110c; font-size: 12px; line-height: 1.6; }.key-result button { align-self: flex-end; }
</style>
