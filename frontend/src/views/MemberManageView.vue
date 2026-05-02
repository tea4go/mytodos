<template>
  <div class="member-manage-page">
    <TopBar title="成员管理" :show-back="true" :is-online="ui.isOnline" />
    <div class="content">
      <MemberList :members="wsStore.members" @edit="onEdit" @remove="onRemove" />
    </div>
    <button @click="onNew" class="fab">+</button>
    <MemberEditDialog :visible="dialogVisible" :member="editingMember" @close="dialogVisible = false" @save="onSave" />
    <LoadingSpinner :visible="ui.loading" text="保存中..." />
    <ErrorToast :message="ui.error" @close="ui.clearError()" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWorkspaceStore } from '../stores/workspace'
import { useUiStore } from '../stores/ui'
import TopBar from '../components/common/TopBar.vue'
import MemberList from '../components/member/MemberList.vue'
import MemberEditDialog from '../components/member/MemberEditDialog.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import ErrorToast from '../components/common/ErrorToast.vue'
import { saveMeta, loadWorkspace } from '../services/sync'
import type { Member, Role, WorkspaceMeta } from '../types'

const wsStore = useWorkspaceStore()
const ui = useUiStore()
const dialogVisible = ref(false)
const editingMember = ref<Member | null>(null)

onMounted(async () => {
  if (!wsStore.meta && wsStore.currentGistId) {
    try { await loadWorkspace(wsStore.currentGistId) } catch { /* ignore */ }
  }
})

function onNew() { editingMember.value = null; dialogVisible.value = true }
function onEdit(m: Member) { editingMember.value = m; dialogVisible.value = true }

async function onSave(data: { displayName: string; role: Role }) {
  if (!wsStore.meta || !wsStore.currentGistId) return
  const now = new Date().toISOString()
  const newMembers = editingMember.value
    ? wsStore.meta.members.map(m => m.memberId === editingMember.value!.memberId ? { ...m, ...data } : m)
    : [...wsStore.meta.members, { memberId: `m_${Date.now()}`, displayName: data.displayName, role: data.role }]
  const newMeta: WorkspaceMeta = { ...wsStore.meta, members: newMembers, workspace: { ...wsStore.meta.workspace, updatedAt: now } }
  await saveMeta(wsStore.currentGistId, newMeta)
  dialogVisible.value = false
}

async function onRemove(memberId: string) {
  if (!wsStore.meta || !wsStore.currentGistId) return
  if (!confirm('确认移除成员？')) return
  const now = new Date().toISOString()
  const newMeta: WorkspaceMeta = {
    ...wsStore.meta,
    members: wsStore.meta.members.filter(m => m.memberId !== memberId),
    workspace: { ...wsStore.meta.workspace, updatedAt: now },
  }
  await saveMeta(wsStore.currentGistId, newMeta)
}
</script>

<style scoped>
.member-manage-page { min-height: 100vh; padding-bottom: 80px; }
.content { padding: 8px 16px; }
.fab { position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 50%; border: none; background: #4A90D9; color: #fff; font-size: 28px; cursor: pointer; box-shadow: 0 4px 12px rgba(74,144,217,0.4); }
</style>
