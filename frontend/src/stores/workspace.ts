import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { WorkspaceMeta, Member, Tag } from '../types'

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspaces = ref<{ workspaceId: string; gistId: string; name: string }[]>([])
  const currentWorkspaceId = ref<string | null>(null)
  const currentGistId = ref<string | null>(null)
  const meta = ref<WorkspaceMeta | null>(null)
  const remoteRevision = ref<string | null>(null)

  const members = computed<Member[]>(() => meta.value?.members ?? [])
  const tags = computed<Tag[]>(() => meta.value?.tags ?? [])

  function setCurrentWorkspace(id: string, gistId: string) {
    currentWorkspaceId.value = id
    currentGistId.value = gistId
    localStorage.setItem('current_workspace_id', id)
    localStorage.setItem('current_gist_id', gistId)
  }

  function setMeta(data: WorkspaceMeta) {
    meta.value = data
    remoteRevision.value = data.revision.remoteRevision
  }

  function restoreWorkspace() {
    const id = localStorage.getItem('current_workspace_id')
    const gid = localStorage.getItem('current_gist_id')
    if (id) currentWorkspaceId.value = id
    if (gid) currentGistId.value = gid
  }

  function loadList() {
    const raw = localStorage.getItem('workspace_list')
    if (raw) {
      try { workspaces.value = JSON.parse(raw) } catch { /* ignore */ }
    }
  }

  function addWorkspace(ws: { workspaceId: string; gistId: string; name: string }) {
    const exists = workspaces.value.find(w => w.workspaceId === ws.workspaceId)
    if (!exists) workspaces.value.push(ws)
    localStorage.setItem('workspace_list', JSON.stringify(workspaces.value))
  }

  return {
    workspaces, currentWorkspaceId, currentGistId, meta, remoteRevision,
    members, tags,
    setCurrentWorkspace, setMeta, restoreWorkspace, loadList, addWorkspace,
  }
})
