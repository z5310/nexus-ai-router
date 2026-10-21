<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Activity, ChevronLeft, ChevronRight, CircleUserRound, KeyRound, LayoutDashboard, LogOut, Menu, MoreHorizontal, Plus, Search, ShieldCheck, UsersRound, X } from 'lucide-vue-next'
import type { AuthUser, UserListResponse, UserRole, UserStatus, UserSummaryResponse } from '@gateway/contracts'
import BrandLogo from '../components/BrandLogo.vue'
import { authState, signOut } from '../lib/auth'
import { getJson, patchJson, postJson } from '../lib/api-client'

const { t, locale } = useI18n()
const router = useRouter()
const queryClient = useQueryClient()
const search = ref('')
const role = ref('')
const status = ref('')
const page = ref(1)
const navOpen = ref(false)
const editorOpen = ref(false)
const editingId = ref<string | null>(null)
const formError = ref('')
const form = reactive({ name: '', email: '', password: '', role: 'viewer' as UserRole, status: 'active' as UserStatus })
const queryString = computed(() => new URLSearchParams({ ...(search.value ? { query: search.value } : {}), ...(role.value ? { role: role.value } : {}), ...(status.value ? { status: status.value } : {}), page: String(page.value), pageSize: '12' }).toString())
const usersQuery = useQuery({ queryKey: computed(() => ['admin-users', queryString.value]), queryFn: () => getJson<UserListResponse>(`/api/admin/users?${queryString.value}`) })
const summaryQuery = useQuery({ queryKey: ['admin-users-summary'], queryFn: () => getJson<UserSummaryResponse>('/api/admin/users/summary') })
const totalPages = computed(() => usersQuery.data.value?.pagination.totalPages || 1)

const saveMutation = useMutation({
  mutationFn: () => editingId.value
    ? patchJson<AuthUser>(`/api/admin/users/${editingId.value}`, { name: form.name, email: form.email, role: form.role, status: form.status, ...(form.password ? { password: form.password } : {}) })
    : postJson<AuthUser>('/api/admin/users', form),
  onSuccess: async () => { editorOpen.value = false; await Promise.all([queryClient.invalidateQueries({ queryKey: ['admin-users'] }), queryClient.invalidateQueries({ queryKey: ['admin-users-summary'] })]) },
  onError: (reason) => { formError.value = reason instanceof Error ? reason.message : t('admin.saveFailed') },
})

function resetFilters() { search.value = ''; role.value = ''; status.value = ''; page.value = 1 }
function openCreate() { editingId.value = null; Object.assign(form, { name: '', email: '', password: '', role: 'viewer', status: 'active' }); formError.value = ''; editorOpen.value = true }
function openEdit(user: AuthUser) { editingId.value = user.id; Object.assign(form, { name: user.name, email: user.email, password: '', role: user.role, status: user.status }); formError.value = ''; editorOpen.value = true }
function initials(name: string) { return name.trim().slice(0, 2).toUpperCase() }
function formatDate(value: string | null) { if (!value) return t('admin.never'); return new Intl.DateTimeFormat(locale.value, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }
async function logout() { await signOut(); await router.replace('/login') }
</script>

<template>
  <main class="admin-page">
    <div class="admin-glow" />
    <aside class="admin-sidebar" :class="{ open: navOpen }">
      <div class="admin-brand"><BrandLogo /><button class="admin-close" @click="navOpen = false"><X :size="19" /></button></div>
      <div class="admin-workspace"><span>N</span><div><small>{{ t('admin.workspace') }}</small><b>Nexus Platform</b></div></div>
      <nav>
        <span>{{ t('admin.management') }}</span>
        <a href="#"><LayoutDashboard :size="18" />{{ t('admin.overview') }}</a>
        <a class="active" href="#users"><UsersRound :size="18" />{{ t('admin.users') }}<b>{{ summaryQuery.data.value?.total ?? '—' }}</b></a>
        <a href="#"><ShieldCheck :size="18" />{{ t('admin.roles') }}</a>
        <span>{{ t('admin.security') }}</span>
        <a href="#"><Activity :size="18" />{{ t('admin.audit') }}</a>
        <a href="#"><KeyRound :size="18" />{{ t('admin.sessions') }}</a>
      </nav>
      <div class="admin-profile"><span>{{ initials(authState.user?.name ?? 'A') }}</span><div><b>{{ authState.user?.name }}</b><small>{{ authState.user?.email }}</small></div><button :aria-label="t('admin.logout')" @click="logout"><LogOut :size="18" /></button></div>
    </aside>

    <section class="admin-main">
      <header class="admin-topbar"><button class="admin-menu" @click="navOpen = true"><Menu :size="21" /></button><div><span>{{ t('admin.kicker') }}</span><b>{{ t('admin.title') }}</b></div><div class="admin-user-chip"><CircleUserRound :size="18" />{{ authState.user?.name }}</div></header>
      <div class="admin-content">
        <div class="admin-heading"><div><span>{{ t('admin.kicker') }}</span><h1>{{ t('admin.title') }}</h1><p>{{ t('admin.description') }}</p></div><button class="admin-primary" @click="openCreate"><Plus :size="18" />{{ t('admin.addUser') }}</button></div>
        <section class="admin-stats">
          <article><span>{{ t('admin.total') }}</span><strong>{{ summaryQuery.data.value?.total ?? '—' }}</strong><small>{{ t('admin.totalHint') }}</small></article>
          <article><span>{{ t('admin.active') }}</span><strong>{{ summaryQuery.data.value?.active ?? '—' }}</strong><small class="positive">● {{ t('admin.normal') }}</small></article>
          <article><span>{{ t('admin.admins') }}</span><strong>{{ summaryQuery.data.value?.admins ?? '—' }}</strong><small>{{ t('admin.adminHint') }}</small></article>
          <article><span>{{ t('admin.pending') }}</span><strong>{{ (summaryQuery.data.value?.invited ?? 0) + (summaryQuery.data.value?.suspended ?? 0) }}</strong><small>{{ t('admin.pendingHint') }}</small></article>
        </section>

        <section id="users" class="admin-panel">
          <header><div><h2>{{ t('admin.directory') }}</h2><p>{{ t('admin.directoryDesc') }}</p></div><button class="admin-primary compact" @click="openCreate"><Plus :size="17" />{{ t('admin.addUser') }}</button></header>
          <div class="admin-filters"><label><Search :size="18" /><input v-model="search" :placeholder="t('admin.search')" @input="page = 1"></label><select v-model="role" @change="page = 1"><option value="">{{ t('admin.allRoles') }}</option><option value="admin">{{ t('admin.roleAdmin') }}</option><option value="manager">{{ t('admin.roleManager') }}</option><option value="viewer">{{ t('admin.roleViewer') }}</option></select><select v-model="status" @change="page = 1"><option value="">{{ t('admin.allStatuses') }}</option><option value="active">{{ t('admin.statusActive') }}</option><option value="invited">{{ t('admin.statusInvited') }}</option><option value="suspended">{{ t('admin.statusSuspended') }}</option></select><button class="admin-reset" @click="resetFilters">{{ t('common.reset') }}</button></div>
          <div class="admin-table-wrap">
            <table><thead><tr><th>{{ t('admin.user') }}</th><th>{{ t('admin.role') }}</th><th>{{ t('admin.status') }}</th><th>{{ t('admin.lastLogin') }}</th><th>{{ t('admin.created') }}</th><th><span class="sr-only">{{ t('admin.actions') }}</span></th></tr></thead>
              <tbody>
                <tr v-if="usersQuery.isPending.value"><td colspan="6" class="admin-empty">{{ t('common.loading') }}</td></tr>
                <tr v-else-if="usersQuery.isError.value"><td colspan="6" class="admin-empty error">{{ usersQuery.error.value?.message }}</td></tr>
                <tr v-else-if="!usersQuery.data.value?.data.length"><td colspan="6" class="admin-empty">{{ t('admin.noUsers') }}</td></tr>
                <tr v-for="user in usersQuery.data.value?.data" :key="user.id">
                  <td><div class="admin-person"><span>{{ initials(user.name) }}</span><div><b>{{ user.name }}</b><small>{{ user.email }}</small></div></div></td>
                  <td><span class="role-pill" :class="user.role">{{ t(`admin.role${user.role[0].toUpperCase()}${user.role.slice(1)}`) }}</span></td>
                  <td><span class="status-pill-admin" :class="user.status"><i />{{ t(`admin.status${user.status[0].toUpperCase()}${user.status.slice(1)}`) }}</span></td>
                  <td>{{ formatDate(user.lastLoginAt) }}</td><td>{{ formatDate(user.createdAt) }}</td>
                  <td><button class="admin-row-action" :aria-label="t('admin.editUser')" @click="openEdit(user)"><MoreHorizontal :size="18" /></button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <footer><span>{{ t('admin.resultCount', { count: usersQuery.data.value?.pagination.total ?? 0 }) }}</span><div><button :disabled="page <= 1" @click="page--"><ChevronLeft :size="17" /></button><b>{{ page }} / {{ totalPages }}</b><button :disabled="page >= totalPages" @click="page++"><ChevronRight :size="17" /></button></div></footer>
        </section>
      </div>
    </section>

    <div v-if="editorOpen" class="admin-modal-backdrop" @click.self="editorOpen = false">
      <form class="admin-modal" @submit.prevent="saveMutation.mutate()"><header><div><span>{{ editingId ? t('admin.editKicker') : t('admin.createKicker') }}</span><h2>{{ editingId ? t('admin.editUser') : t('admin.addUser') }}</h2></div><button type="button" @click="editorOpen = false"><X :size="20" /></button></header><p>{{ t('admin.formDesc') }}</p>
        <label>{{ t('admin.name') }}<input v-model="form.name" required minlength="2"></label>
        <label>{{ t('admin.email') }}<input v-model="form.email" type="email" required></label>
        <label>{{ editingId ? t('admin.newPassword') : t('admin.password') }}<input v-model="form.password" type="password" :required="!editingId" minlength="8" :placeholder="editingId ? t('admin.passwordOptional') : ''"></label>
        <div class="admin-form-grid"><label>{{ t('admin.role') }}<select v-model="form.role"><option value="admin">{{ t('admin.roleAdmin') }}</option><option value="manager">{{ t('admin.roleManager') }}</option><option value="viewer">{{ t('admin.roleViewer') }}</option></select></label><label>{{ t('admin.status') }}<select v-model="form.status"><option value="active">{{ t('admin.statusActive') }}</option><option value="invited">{{ t('admin.statusInvited') }}</option><option value="suspended">{{ t('admin.statusSuspended') }}</option></select></label></div>
        <p v-if="formError" class="admin-form-error">{{ formError }}</p>
        <footer><button type="button" @click="editorOpen = false">{{ t('admin.cancel') }}</button><button class="admin-primary" type="submit" :disabled="saveMutation.isPending.value">{{ saveMutation.isPending.value ? t('admin.saving') : t('admin.save') }}</button></footer>
      </form>
    </div>
  </main>
</template>
