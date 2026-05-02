<template>
  <div class="workspace-settings-page">
    <TopBar title="工作区设置" :show-back="true" :is-online="ui.isOnline" :back-to="`/workspaces/${workspaceId}/admin`" />
    <div class="content">
      <label>工作区名称
        <input v-model="name" maxlength="40" />
      </label>
      <label>描述
        <textarea v-model="description" rows="3" maxlength="200" />
      </label>
      <label>gistId（只读，用于其他成员加入）
        <input :value="wsStore.currentGistId ?? ''" readonly />
      </label>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="save-btn" :disabled="!canSave" @click="save">保存</button>
    </div>
    <LoadingSpinner :visible="ui.loading" text="保存中..." />
    <ErrorToast :message="ui.error" @close="ui.clearError()" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkspaceStore } from '../stores/workspace'
import { useUiStore } from '../stores/ui'
import { saveMeta, loadWorkspace } from '../services/sync'
import TopBar from '../components/common/TopBar.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import ErrorToast from '../components/common/ErrorToast.vue'
import type { WorkspaceMeta } from '../types'

const route = useRoute()
const wsStore = useWorkspaceStore()
const ui = useUiStore()

const workspaceId = computed(() => String(route.params.id))
const name = ref('')
const description = ref('')
const error = ref('')

const canSave = computed(() => name.value.trim().length > 0 && !ui.loading)

watch(() => wsStore.meta, m => {
  if (m) {
    name.value = m.workspace.name
    description.value = m.workspace.description ?? ''
  }
}, { immediate: true })

onMounted(async () => {
  if (!wsStore.meta && wsStore.currentGistId) {
    try { await loadWorkspace(wsStore.currentGistId) } catch { /* ignore */ }
  }
})

async function save() {
  if (!wsStore.meta || !wsStore.currentGistId) return
  if (!name.value.trim()) { error.value = '工作区名称不能为空'; return }
  error.value = ''
  const now = new Date().toISOString()
  const newMeta: WorkspaceMeta = {
    ...wsStore.meta,
    workspace: {
      ...wsStore.meta.workspace,
      name: name.value.trim(),
      description: description.value.trim(),
      updatedAt: now,
    },
  }
  await saveMeta(wsStore.currentGistId, newMeta)
  // 同步本地工作区列表中的名称
  wsStore.addWorkspace({
    workspaceId: wsStore.meta.workspace.workspaceId,
    gistId: wsStore.currentGistId,
    name: name.value.trim(),
  })
}
</script>

<style scoped>
.workspace-settings-page { min-height: 100vh; background: #f8f9fa; }
.content { padding: 16px; display: flex; flex-direction: column; gap: 4px; }
.content label { display: block; margin-top: 12px; font-size: 14px; color: #333; }
.content input, .content textarea {
  width: 100%; padding: 10px; margin-top: 4px;
  border: 1px solid #ddd; border-radius: 8px; font-size: 15px; box-sizing: border-box;
  font-family: inherit;
}
.content input[readonly] { background: #f5f5f5; color: #666; }
.save-btn {
  margin-top: 24px; padding: 12px;
  border: none; border-radius: 8px; background: #4A90D9; color: #fff; font-size: 16px; cursor: pointer;
}
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.error { color: #E74C3C; font-size: 13px; margin-top: 8px; }
</style>
