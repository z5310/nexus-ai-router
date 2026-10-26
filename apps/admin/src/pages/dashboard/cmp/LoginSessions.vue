<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import { Search, ShieldX } from 'lucide-vue-next'
import AButton from 'ant-design-vue/es/button'
import AInput from 'ant-design-vue/es/input'
import AModal from 'ant-design-vue/es/modal'
import APagination from 'ant-design-vue/es/pagination'
import ASelect, { SelectOption as ASelectOption } from 'ant-design-vue/es/select'
import { getAdminSessions, revokeAdminSession } from '../api'
import { DataSkeleton, feedback } from '@gateway/ui'

const queryClient = useQueryClient()
const search = ref('')
const status = ref('active')
const page = ref(1)
const errorMessage = ref('')
const params = computed(() => ({ query: search.value || undefined, status: status.value as 'active' | 'revoked' | 'expired' || undefined, page: page.value, pageSize: 30 }))
const sessions = useQuery({ queryKey: computed(() => ['admin-sessions', params.value]), queryFn: () => getAdminSessions(params.value) })
const revokeMutation = useMutation({ mutationFn: revokeAdminSession, onSuccess: async () => { errorMessage.value = ''; feedback.success('登录会话已撤销'); await queryClient.invalidateQueries({ queryKey: ['admin-sessions'] }) }, onError: (error) => { errorMessage.value = error.message; feedback.error(error, '登录会话撤销失败') } })
function date(value: string) { return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) }
function device(value: string | null) { if (!value) return '未知设备'; if (/Mobile|Android|iPhone/i.test(value)) return '移动设备'; if (/Chrome/i.test(value)) return 'Chrome 浏览器'; if (/Safari/i.test(value)) return 'Safari 浏览器'; return value.slice(0, 46) }
function revoke(id: string, email: string) {
  AModal.confirm({
    title: '撤销登录会话',
    content: `确认撤销 ${email} 的这条登录会话？撤销后该设备需要重新登录。`,
    okText: '撤销',
    cancelText: '取消',
    okType: 'danger',
    onOk: () => revokeMutation.mutateAsync(id),
  })
}
</script>

<template>
  <section class="overflow-hidden rounded-14px border border-white/9 bg-white/2">
    <header class="min-h-68px flex items-center border-b border-white/7 px-18px py-4"><div><h2 class="m-0 text-15px">全平台登录会话</h2><p class="mb-0 mt-1 text-13px text-[#647268]">查看账户活跃设备并即时撤销异常会话；当前会话需通过退出登录结束。</p></div></header>
    <p v-if="errorMessage" class="m-3 rounded-9px border border-red-400/20 bg-red-400/8 px-4 py-3 text-13px text-red-300">{{ errorMessage }}</p>
    <div class="flex flex-wrap items-center gap-3 border-b border-white/7 px-14px py-10px">
      <AInput v-model:value="search" allow-clear class="h-36px w-full max-w-420px text-13px" placeholder="搜索姓名、邮箱或 IP…" @input="page=1"><template #prefix><Search :size="15" /></template></AInput>
      <ASelect v-model:value="status" class="h-36px min-w-128px text-13px" @change="page=1"><ASelectOption value="active">有效会话</ASelectOption><ASelectOption value="revoked">已撤销</ASelectOption><ASelectOption value="expired">已过期</ASelectOption><ASelectOption value="">全部状态</ASelectOption></ASelect>
    </div>
    <div class="overflow-x-auto"><table class="w-full min-w-960px border-collapse">
      <thead><tr class="text-left text-13px text-[#a6b5ab]"><th class="p-14px">用户</th><th>设备</th><th>IP 地址</th><th>最近活动</th><th>到期时间</th><th>状态</th><th class="pr-14px text-right">操作</th></tr></thead>
      <tbody>
        <tr v-if="sessions.isPending.value"><td colspan="7" class="p-4"><DataSkeleton compact :rows="3" label="正在加载登录会话" /></td></tr>
        <tr v-else-if="sessions.isError.value"><td colspan="7" class="p-10 text-center text-13px text-red-300">{{ sessions.error.value?.message }}</td></tr>
        <tr v-else-if="!sessions.data.value?.data.length"><td colspan="7" class="p-10 text-center text-13px text-[#718078]">暂无符合条件的登录会话</td></tr>
        <tr v-for="item in sessions.data.value?.data" :key="item.id" class="border-t border-white/6 text-13px text-[#c3d0c7]">
          <td class="p-14px"><div class="grid gap-1"><b class="text-white">{{ item.user.name }}<i v-if="item.current" class="ml-2 rounded-full bg-emerald-300/10 px-2 py-0.5 text-10px not-italic text-emerald-300">当前</i></b><small class="text-[#647268]">{{ item.user.email }}</small></div></td><td><span :title="item.userAgent || ''">{{ device(item.userAgent) }}</span></td><td class="font-mono text-12px">{{ item.ipAddress || '—' }}</td><td>{{ date(item.lastSeenAt) }}</td><td>{{ date(item.expiresAt) }}</td><td><span :class="['rounded-7px px-2 py-1 text-12px',item.status==='active'?'bg-emerald-300/8 text-emerald-300':item.status==='revoked'?'bg-red-400/8 text-red-300':'bg-white/5 text-[#839087]']">{{ item.status==='active'?'有效':item.status==='revoked'?'已撤销':'已过期' }}</span></td><td class="pr-14px text-right"><AButton v-if="item.status==='active'&&!item.current" class="h-32px px-3 text-12px font-700" :loading="revokeMutation.isPending.value" @click="revoke(item.id,item.user.email)"><ShieldX :size="14" />撤销</AButton><span v-else class="text-12px text-[#59665e]">—</span></td>
        </tr>
      </tbody>
    </table></div>
    <footer class="min-h-50px flex items-center justify-between px-14px text-13px text-[#617067]"><span>共 {{ sessions.data.value?.pagination.total ?? 0 }} 条会话</span><APagination v-model:current="page" :total="sessions.data.value?.pagination.total ?? 0" :page-size="30" :show-size-changer="false" size="small" /></footer>
  </section>
</template>
