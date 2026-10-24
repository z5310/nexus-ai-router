<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, Search } from 'lucide-vue-next'
import { getAuditLogs } from '../api'

const search = ref('')
const outcome = ref('')
const page = ref(1)
const params = computed(() => ({ query: search.value || undefined, outcome: outcome.value as 'success' | 'failure' || undefined, page: page.value, pageSize: 30 }))
const logs = useQuery({ queryKey: computed(() => ['admin-audit-logs', params.value]), queryFn: () => getAuditLogs(params.value) })
const pages = computed(() => logs.data.value?.pagination.totalPages || 1)
const resourceLabels: Record<string, string> = { models: '模型', users: '用户', sessions: '登录会话', providers: '供应商', provider_credentials: '供应商凭证', provider_channels: '供应商渠道', model_deployments: '模型部署', ranking_sources: '排行榜来源', workspace: '工作区', workspace_member: '工作区成员', workspace_invitation: '成员邀请', workspace_ownership: '工作区所有权', workspace_ip_policy: 'IP 策略', api_key: 'API 密钥', route_rule: '路由规则' }
function date(value: string) { return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value)) }
function action(value: string) { return ({ 'admin.post': '创建', 'admin.put': '发布', 'admin.patch': '更新', 'admin.delete': '删除 / 撤销', 'workspace.post': '创建 / 执行', 'workspace.put': '发布', 'workspace.patch': '更新', 'workspace.delete': '删除 / 撤销' }[value] ?? value) }
</script>

<template>
  <section class="overflow-hidden rounded-14px border border-white/9 bg-white/2">
    <header class="min-h-68px flex items-center border-b border-white/7 px-18px py-4"><div><h2 class="m-0 text-15px">不可变审计日志</h2><p class="mb-0 mt-1 text-13px text-[#647268]">记录平台管理与工作区敏感操作的成功和失败，不保存密码、密钥、邀请令牌或请求正文。</p></div></header>
    <div class="flex flex-wrap items-center gap-3 border-b border-white/7 px-14px py-10px">
      <label class="h-36px w-full max-w-420px flex items-center gap-2 rounded-9px border border-white/9 bg-white/2 px-3 text-[#69776e]"><Search :size="15" /><input v-model="search" class="w-full border-0 bg-transparent text-13px text-white outline-none" placeholder="搜索操作者、动作或资源 ID…" @input="page=1"></label>
      <select v-model="outcome" class="h-36px rounded-9px border border-white/9 bg-[#0f1a14] px-3 text-13px text-white" @change="page=1"><option value="">全部结果</option><option value="success">成功</option><option value="failure">失败</option></select>
    </div>
    <div class="overflow-x-auto"><table class="w-full min-w-920px border-collapse">
      <thead><tr class="text-left text-13px text-[#a6b5ab]"><th class="p-14px">时间</th><th>操作者</th><th>动作</th><th>资源</th><th>结果</th><th>来源 IP</th><th class="pr-14px">请求 ID</th></tr></thead>
      <tbody>
        <tr v-if="logs.isPending.value"><td colspan="7" class="p-10 text-center text-13px text-[#718078]">正在加载审计记录…</td></tr>
        <tr v-else-if="logs.isError.value"><td colspan="7" class="p-10 text-center text-13px text-red-300">{{ logs.error.value?.message }}</td></tr>
        <tr v-else-if="!logs.data.value?.data.length"><td colspan="7" class="p-10 text-center text-13px text-[#718078]">暂无符合条件的审计记录</td></tr>
        <tr v-for="item in logs.data.value?.data" :key="item.id" class="border-t border-white/6 text-13px text-[#c3d0c7]">
          <td class="p-14px text-[#91a097]">{{ date(item.createdAt) }}</td><td><div class="grid gap-1"><b class="text-white">{{ item.actorEmail || '系统' }}</b><small class="text-11px text-[#647268]">{{ item.actorUserId || '—' }}</small></div></td><td>{{ action(item.action) }}</td><td><div class="grid gap-1"><span>{{ resourceLabels[item.resourceType] || item.resourceType }}</span><small class="max-w-180px truncate font-mono text-11px text-[#647268]">{{ item.resourceId || '集合' }}</small></div></td><td><span :class="['rounded-7px px-2 py-1 text-12px',item.outcome==='success'?'bg-emerald-300/8 text-emerald-300':'bg-red-400/8 text-red-300']">{{ item.outcome==='success'?'成功':'失败' }}</span></td><td>{{ item.ipAddress || '—' }}</td><td class="max-w-190px truncate pr-14px font-mono text-11px text-[#647268]">{{ item.requestId || '—' }}</td>
        </tr>
      </tbody>
    </table></div>
    <footer class="min-h-50px flex items-center justify-between px-14px text-13px text-[#617067]"><span>共 {{ logs.data.value?.pagination.total ?? 0 }} 条记录</span><div class="flex items-center gap-2"><button class="h-30px w-30px grid place-items-center rounded-8px border border-white/9 bg-white/2 text-[#8d9b92] disabled:opacity-30" :disabled="page<=1" @click="page--"><ChevronLeft :size="14" /></button><b>{{ page }} / {{ pages }}</b><button class="h-30px w-30px grid place-items-center rounded-8px border border-white/9 bg-white/2 text-[#8d9b92] disabled:opacity-30" :disabled="page>=pages" @click="page++"><ChevronRight :size="14" /></button></div></footer>
  </section>
</template>
