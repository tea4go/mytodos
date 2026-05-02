import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GlobalConfig, WorkspaceConfig, Member, Tag, WorkspaceMeta } from '../types'

export const useWorkspaceStore = defineStore('workspace', () => {
  const global = ref<GlobalConfig | null>(null)
  const currentWorkspaceId = ref<string | null>(null)

  /** 工作区列表（对外形态：{ workspaceId, gistId, name }，gistId 即 todosGistId）。 */
  const workspaces = computed(() =>
    (global.value?.workspaces ?? []).map(w => ({
      workspaceId: w.workspaceId,
      gistId: w.todosGistId,
      name: w.name,
    })),
  )

  /** 当前工作区配置（含成员、标签）。 */
  const currentConfig = computed<WorkspaceConfig | null>(() => {
    if (!global.value || !currentWorkspaceId.value) return null
    return global.value.workspaces.find(w => w.workspaceId === currentWorkspaceId.value) ?? null
  })

  /** 当前工作区 todos gistId。 */
  const currentGistId = computed<string | null>(() => currentConfig.value?.todosGistId ?? null)

  const members = computed<Member[]>(() => currentConfig.value?.members ?? [])
  const tags = computed<Tag[]>(() => currentConfig.value?.tags ?? [])

  /** 兼容旧 API：返回类似 meta 的视图。 */
  const meta = computed<WorkspaceMeta | null>(() => {
    const c = currentConfig.value
    if (!c) return null
    return {
      schemaVersion: 2,
      workspace: {
        workspaceId: c.workspaceId,
        name: c.name,
        description: c.description,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      },
      members: c.members,
      tags: c.tags,
      revision: { remoteRevision: '' },
    }
  })

  function setGlobal(cfg: GlobalConfig) {
    global.value = cfg
  }

  /** 兼容旧调用：第二参数 gistId 忽略（数据从全局配置派生）。 */
  function setCurrentWorkspace(workspaceId: string, _gistId?: string) {
    currentWorkspaceId.value = workspaceId
    localStorage.setItem('current_workspace_id', workspaceId)
  }

  function clearCurrentWorkspace() {
    currentWorkspaceId.value = null
    localStorage.removeItem('current_workspace_id')
  }

  function restoreWorkspace() {
    const id = localStorage.getItem('current_workspace_id')
    if (id) currentWorkspaceId.value = id
  }

  /** 兼容旧 API：基于 WorkspaceMeta 更新全局配置中的对应工作区项（仅内存，不写远端）。 */
  function setMeta(m: WorkspaceMeta) {
    if (!global.value) global.value = { schemaVersion: 2, workspaces: [] }
    const existing = global.value.workspaces.find(w => w.workspaceId === m.workspace.workspaceId)
    const cfg: WorkspaceConfig = {
      workspaceId: m.workspace.workspaceId,
      name: m.workspace.name,
      description: m.workspace.description,
      todosGistId: existing?.todosGistId ?? '',
      createdAt: m.workspace.createdAt,
      updatedAt: m.workspace.updatedAt,
      members: m.members,
      tags: m.tags,
    }
    upsertWorkspaceConfig(cfg)
  }

  /** 直接写入全局配置中的工作区项（含 todosGistId）。 */
  function upsertWorkspaceConfig(cfg: WorkspaceConfig) {
    if (!global.value) global.value = { schemaVersion: 2, workspaces: [] }
    const idx = global.value.workspaces.findIndex(w => w.workspaceId === cfg.workspaceId)
    if (idx >= 0) global.value.workspaces[idx] = cfg
    else global.value.workspaces.push(cfg)
  }

  function removeWorkspaceConfig(workspaceId: string) {
    if (!global.value) return
    global.value.workspaces = global.value.workspaces.filter(w => w.workspaceId !== workspaceId)
  }

  /** 兼容旧 API：no-op，列表来自全局配置。 */
  function loadList() { /* no-op */ }

  /** 兼容旧 API：no-op，工作区不再"加入"，由 createWorkspace 直接写入全局配置。 */
  function addWorkspace(_ws: { workspaceId: string; gistId: string; name: string }) { /* no-op */ }

  return {
    global, currentWorkspaceId,
    workspaces, currentConfig, currentGistId, members, tags, meta,
    setGlobal, setCurrentWorkspace, clearCurrentWorkspace, restoreWorkspace,
    setMeta, upsertWorkspaceConfig, removeWorkspaceConfig,
    loadList, addWorkspace,
  }
})
