import type { WorkspaceContext, WorkspaceListResponse } from '@gateway/contracts'
import { computed, reactive, readonly } from 'vue'
import { request, setWorkspaceId } from './http'

const state = reactive<{
  userId: string | null
  items: WorkspaceContext[]
  activeId: string | null
  ready: boolean
  error: string | null
}>({ userId: null, items: [], activeId: null, ready: false, error: null })

export const workspaceState = readonly(state)
export const activeWorkspace = computed(() => state.items.find((item) => item.id === state.activeId) ?? null)
export const activeWorkspaceId = computed(() => state.activeId)

const storageKey = (userId: string) => `nexus.active-workspace.${userId}`

function readStoredWorkspace(userId: string) {
  try { return localStorage.getItem(storageKey(userId)) } catch { return null }
}

function storeWorkspace(userId: string, workspaceId: string) {
  try { localStorage.setItem(storageKey(userId), workspaceId) } catch { /* Storage can be unavailable in private contexts. */ }
}

export async function ensureWorkspaceContext(userId: string) {
  if (state.ready && state.userId === userId && !state.error) return activeWorkspace.value
  try {
    const response = await request<WorkspaceListResponse>({ url: '/api/workspaces' })
    const stored = readStoredWorkspace(userId)
    const selected = response.data.find((item) => item.id === stored) ?? response.data[0] ?? null
    state.userId = userId
    state.items = response.data
    state.activeId = selected?.id ?? null
    state.ready = true
    state.error = null
    setWorkspaceId(state.activeId)
    if (selected) storeWorkspace(userId, selected.id)
    return selected
  } catch (error) {
    state.userId = userId
    state.items = []
    state.activeId = null
    state.ready = true
    state.error = error instanceof Error ? error.message : '工作区加载失败'
    setWorkspaceId(null)
    throw error
  }
}

export function selectWorkspace(workspaceId: string) {
  const workspace = state.items.find((item) => item.id === workspaceId)
  if (!workspace || !state.userId) return false
  state.activeId = workspace.id
  setWorkspaceId(workspace.id)
  storeWorkspace(state.userId, workspace.id)
  return true
}

export function updateWorkspaceContext(workspace: WorkspaceContext) {
  const index = state.items.findIndex((item) => item.id === workspace.id)
  if (index >= 0) state.items[index] = workspace
}

export function resetWorkspaceContext() {
  state.userId = null
  state.items = []
  state.activeId = null
  state.ready = false
  state.error = null
  setWorkspaceId(null)
}

export function workspaceQueryKey(...segments: readonly unknown[]) {
  return ['workspace', state.activeId ?? 'unselected', ...segments] as const
}
