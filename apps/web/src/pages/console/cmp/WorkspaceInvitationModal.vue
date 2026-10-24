<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, Copy, Send } from 'lucide-vue-next'
import AButton from 'ant-design-vue/es/button'
import AInput from 'ant-design-vue/es/input'
import ASelect, { SelectOption as ASelectOption } from 'ant-design-vue/es/select'
import type { CreateWorkspaceInvitationInput } from '@gateway/contracts'
import ModalShell from './ModalShell.vue'

const props = defineProps<{ open: boolean; busy: boolean; allowAdmin: boolean; link?: string; error?: string }>()
const emit = defineEmits<{ close: []; submit: [value: CreateWorkspaceInvitationInput] }>()
const email = ref('')
const role = ref<CreateWorkspaceInvitationInput['role']>('developer')
const copied = ref(false)
const valid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()))

watch(() => props.open, (open) => {
  if (open) { email.value = ''; role.value = 'developer'; copied.value = false }
})

async function copyLink() {
  if (!props.link) return
  await navigator.clipboard.writeText(props.link)
  copied.value = true
}
</script>

<template>
  <ModalShell v-if="open" title="邀请工作区成员" description="邀请链接七天内有效、仅限指定邮箱，并且只能接受一次。" :busy="busy" @close="emit('close')">
    <div v-if="link" class="invitation-result">
      <span><Check :size="18" />邀请已创建</span>
      <p>当前尚未接入邮件服务，请复制链接并通过可信渠道发送给被邀请人。</p>
      <code>{{ link }}</code>
      <AButton @click="copyLink"><Copy :size="15" />{{ copied ? '已复制' : '复制邀请链接' }}</AButton>
    </div>
    <form v-else class="invitation-form" @submit.prevent="valid && emit('submit', { email: email.trim(), role })">
      <label>邮箱<AInput v-model:value="email" type="email" :maxlength="180" autocomplete="email" placeholder="member@example.com" /></label>
      <label>工作区角色<ASelect v-model:value="role"><ASelectOption v-if="allowAdmin" value="admin">管理员</ASelectOption><ASelectOption value="developer">开发者</ASelectOption><ASelectOption value="billing">财务</ASelectOption><ASelectOption value="viewer">只读成员</ASelectOption></ASelect></label>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <footer><AButton ghost :disabled="busy" @click="emit('close')">取消</AButton><AButton html-type="submit" :loading="busy" :disabled="!valid"><Send :size="15" />{{ busy ? '正在创建…' : '创建邀请' }}</AButton></footer>
    </form>
  </ModalShell>
</template>

<style scoped>
.invitation-form,.invitation-result{display:grid;gap:16px;padding:22px}.invitation-form label{display:grid;gap:8px;color:#9aaba0;font-size:12px}.invitation-form :deep(.ant-input),.invitation-form :deep(.ant-select-selector){min-height:42px}.invitation-form footer{display:flex;justify-content:flex-end;gap:10px;padding-top:3px}.invitation-form button,.invitation-result button{display:inline-flex;align-items:center;justify-content:center;gap:7px;font-weight:700}.invitation-form button:disabled{opacity:.45}.form-error{margin:0;color:#f4a5a5;font-size:12px}.invitation-result span{display:flex;align-items:center;gap:8px;color:#9ef1bd;font-weight:700}.invitation-result p{margin:0;color:#819087;font-size:12px;line-height:1.6}.invitation-result code{overflow-wrap:anywhere;padding:12px;color:#b9c8bd;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:#09110c;font-size:11px;line-height:1.6}.invitation-result button{justify-self:start}
</style>
