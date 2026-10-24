<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { CreateWorkspaceInvitationInput, WorkspaceInvitation, WorkspaceInvitationSecret, WorkspaceMemberSummary, UpdateWorkspaceMemberInput } from '@gateway/contracts'
import { Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-vue-next'
import { authState } from '../../../lib/auth'
import { createWorkspaceInvitation, getWorkspaceInvitations, getWorkspaceMembers, changeWorkspaceMember, removeWorkspaceMember, resendWorkspaceInvitation, revokeWorkspaceInvitation, transferWorkspaceOwnership } from '../api'
import { activeWorkspace, ensureWorkspaceContext, resetWorkspaceContext, workspaceQueryKey } from '../../../lib/workspace'
import WorkspaceInvitationModal from './WorkspaceInvitationModal.vue'

const query = useQuery({ queryKey: computed(() => workspaceQueryKey('workspace-members')), queryFn: ({ signal }) => getWorkspaceMembers(signal) })
const roles: Record<string, string> = { owner: '所有者', admin: '管理员', developer: '开发者', billing: '财务', viewer: '只读成员' }
const client = useQueryClient()
const canManage = computed(() => ['owner', 'admin'].includes(activeWorkspace.value?.role ?? ''))
const isOwner = computed(() => activeWorkspace.value?.role === 'owner')
const invitationQuery = useQuery({ queryKey: computed(() => workspaceQueryKey('workspace-invitations')), queryFn: ({ signal }) => getWorkspaceInvitations(signal), enabled: canManage })
const invitationOpen = ref(false)
const invitationSecret = ref<WorkspaceInvitationSecret | null>(null)
const invitationError = ref('')
const mutation = useMutation({
  mutationFn: ({ id, role }: { id: string; role: UpdateWorkspaceMemberInput['role'] | null }) => role ? changeWorkspaceMember(id, { role }) : removeWorkspaceMember(id),
  onSuccess: () => client.invalidateQueries({ queryKey: workspaceQueryKey('workspace-members') }),
})
const invitationMutation = useMutation({
  mutationFn: (input: CreateWorkspaceInvitationInput) => createWorkspaceInvitation(input),
  onSuccess: async (result) => { invitationSecret.value = result; await client.invalidateQueries({ queryKey: workspaceQueryKey('workspace-invitations') }) },
  onError: (error) => { invitationError.value = error instanceof Error ? error.message : '邀请创建失败' },
})
const resendMutation = useMutation({
  mutationFn: (id: string) => resendWorkspaceInvitation(id),
  onSuccess: async (result) => {
    invitationSecret.value = result
    invitationOpen.value = true
    await client.invalidateQueries({ queryKey: workspaceQueryKey('workspace-invitations') })
  },
})
const revokeMutation = useMutation({ mutationFn: (id: string) => revokeWorkspaceInvitation(id), onSuccess: () => client.invalidateQueries({ queryKey: workspaceQueryKey('workspace-invitations') }) })
const transferMutation = useMutation({
  mutationFn: (memberId: string) => transferWorkspaceOwnership({ memberId }),
  onSuccess: async () => {
    if (authState.user) { resetWorkspaceContext(); await ensureWorkspaceContext(authState.user.id) }
    await client.invalidateQueries()
  },
})
const invitationLink = computed(() => invitationSecret.value ? `${window.location.origin}/workspace-invitations/${invitationSecret.value.token}` : undefined)
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
function openInvitation() { invitationSecret.value = null; invitationError.value = ''; invitationOpen.value = true }
function closeInvitation() { invitationOpen.value = false; invitationSecret.value = null; invitationError.value = '' }
function resend(invitation: WorkspaceInvitation) {
  if (window.confirm(`为 ${invitation.email} 生成新的邀请链接？旧链接会立即失效。`)) resendMutation.mutate(invitation.id)
}
function revoke(invitation: WorkspaceInvitation) {
  if (window.confirm(`撤销发送给 ${invitation.email} 的邀请？`)) revokeMutation.mutate(invitation.id)
}
function transfer(member: WorkspaceMemberSummary) {
  if (window.confirm(`将工作区所有权转移给 ${member.name}？你将变为管理员。`)) transferMutation.mutate(member.id)
}
const dateTime = (value: string) => new Intl.DateTimeFormat(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
const statusText: Record<WorkspaceInvitation['status'], string> = { pending: '待接受', accepted: '已接受', revoked: '已撤销', expired: '已过期' }
</script>

<template>
  <section class="console-surface">
    <div class="member-heading"><div><h2>工作区成员</h2><p>通过一次性邀请链接加入；角色变更和移除会立即生效。</p></div><button v-if="canManage" class="invite-button" @click="openInvitation"><Plus :size="15" />邀请成员</button></div>
    <p v-if="mutation.isError.value" role="alert">{{ mutation.error.value?.message }}</p>
    <p v-if="transferMutation.isError.value" role="alert">{{ transferMutation.error.value?.message }}</p>
    <p v-if="query.isPending.value" role="status">正在加载成员…</p>
    <p v-else-if="query.isError.value" role="alert">成员加载失败。<button @click="query.refetch()">重试</button></p>
    <div v-else class="request-table console-data-table responsive-table">
      <table><thead><tr><th>成员</th><th>邮箱</th><th>工作区角色</th><th>成员状态</th><th v-if="canManage">操作</th></tr></thead>
        <tbody>
          <tr v-if="!query.data.value?.data.length" class="table-empty"><td :colspan="canManage ? 5 : 4">暂无成员</td></tr>
          <tr v-for="member in query.data.value?.data" :key="member.id"><td data-label="成员"><b>{{ member.name }}</b></td><td data-label="邮箱">{{ member.email }}</td><td data-label="工作区角色">
            <select v-if="editable(member)" :value="member.role" :disabled="mutation.isPending.value" @change="changeRole(member, $event)"><option v-if="activeWorkspace?.role === 'owner'" value="admin">管理员</option><option value="developer">开发者</option><option value="billing">财务</option><option value="viewer">只读成员</option></select>
            <span v-else>{{ roles[member.role] ?? member.role }}</span>
          </td><td data-label="成员状态">{{ member.status === 'active' ? '已加入' : '待激活' }}</td><td v-if="canManage" data-label="操作"><div v-if="editable(member)" class="row-actions"><button :disabled="mutation.isPending.value" @click="remove(member)">移除</button><button v-if="isOwner" class="transfer" :disabled="transferMutation.isPending.value" @click="transfer(member)"><ShieldCheck :size="13" />转移所有权</button></div><span v-else>—</span></td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <section v-if="canManage" class="console-surface invitations-panel">
    <div class="member-heading"><div><h2>成员邀请</h2><p>邀请只显示元数据；原始链接仅在创建或重新发送后展示一次。</p></div></div>
    <p v-if="resendMutation.isError.value || revokeMutation.isError.value" role="alert">{{ resendMutation.error.value?.message || revokeMutation.error.value?.message }}</p>
    <p v-if="invitationQuery.isPending.value" role="status">正在加载邀请…</p>
    <p v-else-if="invitationQuery.isError.value" role="alert">邀请加载失败。<button @click="invitationQuery.refetch()">重试</button></p>
    <div v-else class="request-table console-data-table responsive-table"><table><thead><tr><th>邮箱</th><th>角色</th><th>状态</th><th>有效期</th><th>操作</th></tr></thead><tbody>
      <tr v-if="!invitationQuery.data.value?.data.length" class="table-empty"><td colspan="5">暂无邀请</td></tr>
      <tr v-for="invitation in invitationQuery.data.value?.data" :key="invitation.id"><td data-label="邮箱"><b>{{ invitation.email }}</b></td><td data-label="角色">{{ roles[invitation.role] }}</td><td data-label="状态"><span :class="['invite-status', invitation.status]">{{ statusText[invitation.status] }}</span></td><td data-label="有效期">{{ dateTime(invitation.expiresAt) }}</td><td data-label="操作"><div v-if="invitation.status === 'pending' || invitation.status === 'expired'" class="row-actions"><button :disabled="resendMutation.isPending.value || revokeMutation.isPending.value" @click="resend(invitation)"><RefreshCw :size="13" />重新发送</button><button class="danger" :disabled="resendMutation.isPending.value || revokeMutation.isPending.value" @click="revoke(invitation)"><Trash2 :size="13" />撤销</button></div><span v-else>—</span></td></tr>
    </tbody></table></div>
  </section>

  <WorkspaceInvitationModal :open="invitationOpen" :busy="invitationMutation.isPending.value" :allow-admin="isOwner" :link="invitationLink" :error="invitationError" @close="closeInvitation" @submit="invitationMutation.mutate" />
</template>

<style scoped>
select, button { padding: 8px 10px; color: #fff; border: 1px solid rgba(255,255,255,.15); border-radius: 7px; background: #111d15; font: inherit; }
button { color: #f4a5a5; }
button:disabled, select:disabled { opacity: .5; }
.member-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 20px 16px}.member-heading h2{margin:0;color:#edf6ef;font-size:16px}.member-heading p{margin:5px 0 0;color:#718078;font-size:11px}.invite-button{display:inline-flex;align-items:center;gap:6px;color:#102016;border:0;background:#dce7de;font-weight:700}.row-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.row-actions button{display:inline-flex;align-items:center;gap:5px;color:#aebbb2}.row-actions button.danger{color:#f4a5a5}.row-actions button.transfer{color:#9eeab8}.invitations-panel{margin-top:16px}.invite-status{display:inline-flex;padding:4px 8px;border-radius:999px;color:#a9b6ad;background:rgba(255,255,255,.05);font-size:11px}.invite-status.pending{color:#9eebba;background:rgba(85,223,139,.1)}.invite-status.revoked,.invite-status.expired{color:#d99f9f;background:rgba(230,100,100,.08)}
</style>
