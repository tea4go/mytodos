<template>
  <div class="tag-manage-page">
    <TopBar title="标签管理" :show-back="true" :is-online="ui.isOnline" />
    <div class="content">
      <TagList :tags="wsStore.tags" @edit="onEdit" @delete="onDelete" />
    </div>
    <button @click="onNew" class="fab">+</button>
    <TagEditDialog :visible="dialogVisible" :tag="editingTag" @close="dialogVisible = false" @save="onSave" />
    <LoadingSpinner :visible="ui.loading" text="保存中..." />
    <ErrorToast :message="ui.error" @close="ui.clearError()" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWorkspaceStore } from '../stores/workspace'
import { useUiStore } from '../stores/ui'
import TopBar from '../components/common/TopBar.vue'
import TagList from '../components/tag/TagList.vue'
import TagEditDialog from '../components/tag/TagEditDialog.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import ErrorToast from '../components/common/ErrorToast.vue'
import { saveMeta, loadWorkspace } from '../services/sync'
import type { Tag, WorkspaceMeta } from '../types'

const wsStore = useWorkspaceStore()
const ui = useUiStore()
const dialogVisible = ref(false)
const editingTag = ref<Tag | null>(null)

onMounted(async () => {
  if (!wsStore.meta && wsStore.currentGistId) {
    try { await loadWorkspace(wsStore.currentGistId) } catch { /* ignore */ }
  }
})

function onNew() { editingTag.value = null; dialogVisible.value = true }
function onEdit(tag: Tag) { editingTag.value = tag; dialogVisible.value = true }

async function onSave(data: { name: string; color: string }) {
  if (!wsStore.meta || !wsStore.currentGistId) return
  const now = new Date().toISOString()
  const newTags = editingTag.value
    ? wsStore.meta.tags.map(t => t.tagId === editingTag.value!.tagId ? { ...t, ...data } : t)
    : [...wsStore.meta.tags, { tagId: `tag_${Date.now()}`, name: data.name, color: data.color, createdAt: now }]
  const newMeta: WorkspaceMeta = { ...wsStore.meta, tags: newTags, workspace: { ...wsStore.meta.workspace, updatedAt: now } }
  await saveMeta(wsStore.currentGistId, newMeta)
  dialogVisible.value = false
}

async function onDelete(tagId: string) {
  if (!wsStore.meta || !wsStore.currentGistId) return
  if (!confirm('确认删除标签？')) return
  const now = new Date().toISOString()
  const newMeta: WorkspaceMeta = {
    ...wsStore.meta,
    tags: wsStore.meta.tags.filter(t => t.tagId !== tagId),
    workspace: { ...wsStore.meta.workspace, updatedAt: now },
  }
  await saveMeta(wsStore.currentGistId, newMeta)
}
</script>

<style scoped>
.tag-manage-page { min-height: 100vh; padding-bottom: 80px; }
.content { padding: 8px 16px; }
.fab { position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 50%; border: none; background: #4A90D9; color: #fff; font-size: 28px; cursor: pointer; box-shadow: 0 4px 12px rgba(74,144,217,0.4); }
</style>
