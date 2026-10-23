<script setup lang="ts">
import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { WorkspaceMemberSummary, UpdateWorkspaceMemberInput } from '@gateway/contracts'
import { authState } from '../../../lib/auth'
import { getWorkspaceMembers, changeWorkspaceMember, removeWorkspaceMember } from '../api'
import { activeWorkspace, workspaceQueryKey } from '../../../lib/workspace'

const query = useQuery({ queryKey: computed(() => workspaceQueryKey('workspace-members')), queryFn: ({ signal }) => getWorkspaceMembers(signal) })
const roles: Record<string, string> = { owner: '所有者', admin: '管理员', developer: '开发者', billing: '财务', viewer: '只读成员' }
const client = useQueryClient()
const canManage = computed(() => ['owner', 'admin'].includes(activeWorkspace.value?.role ?? ''))
const mutation = useMutation({
  mutationFn: ({ id, role }: { id: string; role: UpdateWorkspaceMemberInput['role'] | null }) => role ? changeWorkspaceMember(id, { role }) : removeWorkspaceMember(id),
  onSuccess: () => client.invalidateQueries({ queryKey: workspaceQueryKey('workspace-members') }),
})
function editable(member: WorkspaceMemberSummary) {
  return canManage.value && member.role !== 'owner' && member.email !== authState.user?.email
    && (activeWorkspace.value?.role === 'owner' || member.role !== 'admin')
}
function changeRole(member: WorkspaceMemberSummary, event: Event) {
  const select = event.target as HTMLSelectElement
  const role = select.value as UpdateWorkspaceMemberInput['role']
  select.value = member.role
  if (role !== member.role && window.confirm(`将 ${member.name} 的角色修改为${roles[role]}？`)) mutation.mutate({ id: member.id, role })
}
function remove(member: WorkspaceMemberSummary) {
  if (window.confirm(`移除 ${member.name}？该成员在此工作区创建的 API Key 也将被撤销。`)) mutation.mutate({ id: member.id, role: null })
}
</script>

<template>
  <section class="console-surface">
    <p v-if="mutation.isError.value" role="alert">{{ mutation.error.value?.message }}</p>
    <p v-if="query.isPending.value" role="status">正在加载成员…</p>
    <p v-else-if="query.isError.value" role="alert">成员加载失败。<button @click="query.refetch()">重试</button></p>
    <div v-else class="request-table console-data-table responsive-table">
      <table><thead><tr><th>成员</th><th>邮箱</th><th>工作区角色</th><th>成员状态</th><th v-if="canManage">操作</th></tr></thead>
        <tbody>
          <tr v-if="!query.data.value?.data.length" class="table-empty"><td :colspan="canManage ? 5 : 4">暂无成员</td></tr>
          <tr v-for="member in query.data.value?.data" :key="member.id"><td data-label="成员"><b>{{ member.name }}</b></td><td data-label="邮箱">{{ member.email }}</td><td data-label="工作区角色">
            <select v-if="editable(member)" :value="member.role" :disabled="mutation.isPending.value" @change="changeRole(member, $event)"><option v-if="activeWorkspace?.role === 'owner'" value="admin">管理员</option><option value="developer">开发者</option><option value="billing">财务</option><option value="viewer">只读成员</option></select>
            <span v-else>{{ roles[member.role] ?? member.role }}</span>
          </td><td data-label="成员状态">{{ member.status === 'active' ? '已加入' : '待激活' }}</td><td v-if="canManage" data-label="操作"><button v-if="editable(member)" :disabled="mutation.isPending.value" @click="remove(member)">移除</button><span v-else>—</span></td></tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
select, button { padding: 8px 10px; color: #fff; border: 1px solid rgba(255,255,255,.15); border-radius: 7px; background: #111d15; font: inherit; }
button { color: #f4a5a5; }
button:disabled, select:disabled { opacity: .5; }
</style>
