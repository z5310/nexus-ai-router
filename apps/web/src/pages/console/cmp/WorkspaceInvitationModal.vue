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
    <div v-if="link" class="grid gap-4 p-[22px]">
      <span class="flex items-center gap-2 font-700 text-[#9ef1bd]"><Check :size="18" />邀请已创建</span>
      <p class="m-0 text-xs leading-[1.6] text-[#819087]">当前尚未接入邮件服务，请复制链接并通过可信渠道发送给被邀请人。</p>
      <code class="overflow-wrap-anywhere rounded-2.25 border border-white/8 bg-[#09110c] p-3 text-[11px] leading-[1.6] text-[#b9c8bd]">{{ link }}</code>
      <AButton class="justify-self-start font-700" @click="copyLink"><Copy :size="15" />{{ copied ? '已复制' : '复制邀请链接' }}</AButton>
    </div>
    <form v-else class="grid gap-4 p-[22px]" @submit.prevent="valid && emit('submit', { email: email.trim(), role })">
      <label class="grid gap-2 text-xs text-[#9aaba0]">邮箱<AInput v-model:value="email" class="min-h-10.5" type="email" :maxlength="180" autocomplete="email" placeholder="member@example.com" /></label>
      <label class="grid gap-2 text-xs text-[#9aaba0]">工作区角色<ASelect v-model:value="role" class="min-h-10.5"><ASelectOption v-if="allowAdmin" value="admin">管理员</ASelectOption><ASelectOption value="developer">开发者</ASelectOption><ASelectOption value="billing">财务</ASelectOption><ASelectOption value="viewer">只读成员</ASelectOption></ASelect></label>
      <p v-if="error" class="m-0 text-xs text-[#f4a5a5]" role="alert">{{ error }}</p>
      <footer class="flex justify-end gap-2.5 pt-0.75"><AButton ghost :disabled="busy" @click="emit('close')">取消</AButton><AButton html-type="submit" :loading="busy" :disabled="!valid"><Send :size="15" />{{ busy ? '正在创建…' : '创建邀请' }}</AButton></footer>
    </form>
  </ModalShell>
</template>
