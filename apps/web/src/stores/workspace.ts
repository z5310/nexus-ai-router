import { computed, ref, toRef } from 'vue'
import { defineStore } from 'pinia'
import type { WorkspaceContext, WorkspaceListResponse } from '@gateway/contracts'
import { request, setWorkspaceId } from '../lib/http'
import { pinia } from './pinia'

const storageKey = (userId: string) => `nexus.active-workspace.${userId}`

function readStoredWorkspace(userId: string) {
  try { return localStorage.getItem(storageKey(userId)) } catch { return null }
}

function storeWorkspace(userId: string, workspaceId: string) {
  try { localStorage.setItem(storageKey(userId), workspaceId) } catch { /* Storage can be unavailable in private contexts. */ }
}

export const useWorkspaceStore = defineStore('workspace', () => {
  const userId = ref<string | null>(null)
  const items = ref<WorkspaceContext[]>([])
  const activeId = ref<string | null>(null)
  const ready = ref(false)
  const error = ref<string | null>(null)
  const activeWorkspace = computed(() => items.value.find((item) => item.id === activeId.value) ?? null)

  async function ensure(user: string) {
    if (ready.value && userId.value === user && !error.value) return activeWorkspace.value
    try {
      const response = await request<WorkspaceListResponse>({ url: '/api/workspaces' })
      const stored = readStoredWorkspace(user)
      const selected = response.data.find((item) => item.id === stored) ?? response.data[0] ?? null
      userId.value = user
      items.value = response.data
      activeId.value = selected?.id ?? null
      ready.value = true
      error.value = null
      setWorkspaceId(activeId.value)
      if (selected) storeWorkspace(user, selected.id)
      return selected
    } catch (reason) {
      userId.value = user
      items.value = []
      activeId.value = null
      ready.value = true
      error.value = reason instanceof Error ? reason.message : '工作区加载失败'
      setWorkspaceId(null)
      throw reason
    }
  }

  function select(workspaceId: string) {
    const workspace = items.value.find((item) => item.id === workspaceId)
    if (!workspace || !userId.value) return false
    activeId.value = workspace.id
    setWorkspaceId(workspace.id)
    storeWorkspace(userId.value, workspace.id)
    return true
  }

  function update(workspace: WorkspaceContext) {
    const index = items.value.findIndex((item) => item.id === workspace.id)
    if (index >= 0) items.value[index] = workspace
  }

  function reset() {
    userId.value = null
    items.value = []
    activeId.value = null
    ready.value = false
    error.value = null
    setWorkspaceId(null)
  }

  function queryKey(...segments: readonly unknown[]) {
    return ['workspace', activeId.value ?? 'unselected', ...segments] as const
  }

  return { userId, items, activeId, ready, error, activeWorkspace, ensure, select, update, reset, queryKey }
})

export const workspaceStore = useWorkspaceStore(pinia)
export const workspaceState = workspaceStore
export const activeWorkspace = toRef(workspaceStore, 'activeWorkspace')
export const activeWorkspaceId = toRef(workspaceStore, 'activeId')
export const ensureWorkspaceContext = (userId: string) => workspaceStore.ensure(userId)
export const selectWorkspace = (workspaceId: string) => workspaceStore.select(workspaceId)
export const updateWorkspaceContext = (workspace: WorkspaceContext) => workspaceStore.update(workspace)
export const resetWorkspaceContext = () => workspaceStore.reset()
export const workspaceQueryKey = (...segments: readonly unknown[]) => workspaceStore.queryKey(...segments)
