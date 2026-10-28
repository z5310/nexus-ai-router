<script setup lang="ts">
import { Activity, Blocks, ChevronDown, CircleDollarSign, Code2, KeyRound, LayoutDashboard, Menu, Rocket, Route, Search, Settings, Users, X } from 'lucide-vue-next'
import { useQueryClient } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import BrandLogo from '../../../components/BrandLogo.vue'
import UserMenu from './UserMenu.vue'
import { activeWorkspace, ensureWorkspaceContext, selectWorkspace, workspaceState } from '../../../stores/workspace'
import { authState } from '../../../stores/auth'

defineProps<{ search?: string }>()
const emit = defineEmits<{ 'update:search': [value: string] }>()
const queryClient = useQueryClient()
const router = useRouter()
const sideOpen = ref(false)
const { t } = useI18n()
const roleNames = { owner: '所有者', admin: '管理员', developer: '开发者', billing: '财务', viewer: '只读成员' } as const

const navigation = computed(() => [
  { groupKey: 'dashboard.workspace', links: [
    { to: '/console', labelKey: 'dashboard.overview', icon: LayoutDashboard, exact: true },
    { to: '/console/getting-started', label: '首次调用', icon: Rocket },
    { to: '/console/models', labelKey: 'dashboard.models', icon: Blocks },
    { to: '/console/routes', labelKey: 'dashboard.routes', icon: Route },
    { to: '/console/keys', labelKey: 'dashboard.keys', icon: KeyRound },
  ] },
  { groupKey: 'dashboard.operations', links: [
    { to: '/console/logs', labelKey: 'dashboard.logs', icon: Activity },
    { to: '/console/billing', labelKey: 'dashboard.billing', icon: CircleDollarSign },
    { to: '/console/members', labelKey: 'dashboard.members', icon: Users },
  ] },
  { groupKey: 'dashboard.system', links: [
    { to: '/console/settings', labelKey: 'dashboard.settings', icon: Settings },
  ] },
].map((group) => ({
  ...group,
  links: group.links.filter((link) => {
    const role = activeWorkspace.value?.role
    if (!role) return false
    if (['/console/models', '/console/routes'].includes(link.to)) return ['owner', 'admin', 'developer', 'viewer'].includes(role)
    if (link.to === '/console/keys') return ['owner', 'admin', 'developer'].includes(role)
    if (link.to === '/console/billing') return ['owner', 'admin', 'billing'].includes(role)
    if (link.to === '/console/settings') return ['owner', 'admin'].includes(role)
    return true
  }),
})))

async function changeWorkspace(event: Event) {
  const id = (event.target as HTMLSelectElement).value
  if (!id || id === workspaceState.activeId) return
  await queryClient.cancelQueries({ queryKey: ['workspace'] })
  queryClient.removeQueries({ queryKey: ['workspace'] })
  if (selectWorkspace(id)) {
    sideOpen.value = false
    await router.push('/console')
  }
}

async function retryWorkspace() {
  if (!authState.user) return
  try { await ensureWorkspaceContext(authState.user.id) } catch { /* Error remains visible in the shell. */ }
}
</script>

<template>
  <div class="console-page">
    <aside :class="['console-sidebar', { open: sideOpen }]">
      <div class="console-logo"><BrandLogo /><button aria-label="关闭导航" @click="sideOpen = false"><X :size="18" /></button></div>
      <label class="workspace-switch"><span>{{ activeWorkspace?.name?.slice(0, 1).toUpperCase() || 'N' }}</span><div><small>{{ t('dashboard.currentWorkspace') }}</small><b>{{ activeWorkspace?.name ?? (workspaceState.ready ? '暂无工作区' : '加载中…') }}</b><select :value="workspaceState.activeId ?? ''" aria-label="切换工作区" :disabled="workspaceState.items.length < 2" @change="changeWorkspace"><option v-for="workspace in workspaceState.items" :key="workspace.id" :value="workspace.id">{{ workspace.name }}</option></select></div><ChevronDown v-if="workspaceState.items.length > 1" :size="15" /></label>
      <nav v-for="group in navigation" :key="group.groupKey">
        <span>{{ t(group.groupKey) }}</span>
        <RouterLink v-for="link in group.links" :key="link.to" :to="link.to" :active-class="link.exact ? '' : 'active'" :class="{ active: link.exact && $route.path === link.to }" @click="sideOpen = false"><component :is="link.icon" :size="17" /> {{ link.label ?? t(link.labelKey ?? '') }}</RouterLink>
      </nav>
      <div v-if="activeWorkspace" class="workspace-context-card"><small>当前权限</small><strong>{{ roleNames[activeWorkspace.role] }}</strong><p>{{ activeWorkspace.slug }}</p></div>
    </aside>
    <main class="console-main">
      <header class="console-header">
        <button class="console-menu" :aria-label="t('common.openNav')" @click="sideOpen = true"><Menu :size="19" /></button>
        <label><Search :size="15" /><input :value="search" :placeholder="t('dashboard.search')" @input="emit('update:search', ($event.target as HTMLInputElement).value)" /></label>
        <div class="console-actions"><a href="/docs" target="_blank" rel="noopener noreferrer"><Code2 :size="16" /> {{ t('common.docs') }}</a><UserMenu /></div>
      </header>
      <div class="console-content">
        <div v-if="workspaceState.error" class="console-state error" role="alert"><div><b>工作区加载失败</b><span>{{ workspaceState.error }}</span></div><button class="console-secondary-action" @click="retryWorkspace">重试</button></div>
        <slot v-else-if="activeWorkspace" />
        <div v-else class="console-state" role="status">当前账户暂无可用工作区。</div>
      </div>
    </main>
  </div>
</template>
