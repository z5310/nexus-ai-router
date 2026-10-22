<script setup lang="ts">
import { Activity, Bell, Blocks, ChevronDown, CircleDollarSign, Code2, KeyRound, LayoutDashboard, Menu, Plus, Route, Search, Settings, Users, X } from 'lucide-vue-next'
import { useQuery } from '@tanstack/vue-query'
import { getWorkspaceSettings } from '../api'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BrandLogo from '../../../components/BrandLogo.vue'
import UserMenu from './UserMenu.vue'

defineProps<{ search?: string }>()
const emit = defineEmits<{ 'update:search': [value: string] }>()
const workspaceQuery = useQuery({ queryKey: ['workspace-settings'], queryFn: ({ signal }) => getWorkspaceSettings(signal) })
const sideOpen = ref(false)
const { t } = useI18n()

const navigation = [
  { groupKey: 'dashboard.workspace', links: [
    { to: '/console', labelKey: 'dashboard.overview', icon: LayoutDashboard, exact: true },
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
]
</script>

<template>
  <div class="console-page">
    <aside :class="['console-sidebar', { open: sideOpen }]">
      <div class="console-logo"><BrandLogo /><button @click="sideOpen = false"><X :size="18" /></button></div>
      <div class="workspace-switch"><span>N</span><div><small>{{ t('dashboard.currentWorkspace') }}</small><b>{{ workspaceQuery.data.value?.name ?? (workspaceQuery.isError.value ? '加载失败' : '加载中…') }}</b></div><ChevronDown :size="15" /></div>
      <nav v-for="group in navigation" :key="group.groupKey">
        <span>{{ t(group.groupKey) }}</span>
        <RouterLink v-for="link in group.links" :key="link.to" :to="link.to" :active-class="link.exact ? '' : 'active'" :class="{ active: link.exact && $route.path === link.to }" @click="sideOpen = false"><component :is="link.icon" :size="17" /> {{ t(link.labelKey) }}</RouterLink>
      </nav>
      <div class="balance-card"><small>{{ t('dashboard.balance') }}</small><strong>¥ 328.42</strong><span><i :style="{ width: '34%' }" /></span><p>{{ t('dashboard.usedValue', { amount: '171.58' }) }}</p><button><Plus :size="14" /> {{ t('dashboard.recharge') }}</button></div>
    </aside>
    <main class="console-main">
      <header class="console-header">
        <button class="console-menu" :aria-label="t('common.openNav')" @click="sideOpen = true"><Menu :size="19" /></button>
        <label><Search :size="15" /><input :value="search" :placeholder="t('dashboard.search')" @input="emit('update:search', ($event.target as HTMLInputElement).value)" /></label>
        <div class="console-actions"><a href="/docs" target="_blank" rel="noopener noreferrer"><Code2 :size="16" /> {{ t('common.docs') }}</a><button class="console-notification" :aria-label="t('dashboard.notifications')"><Bell :size="17" /><i /></button><UserMenu /></div>
      </header>
      <div class="console-content"><slot /></div>
    </main>
  </div>
</template>
