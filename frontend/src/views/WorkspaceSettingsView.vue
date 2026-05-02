<template>
  <div class="ws-mgmt-page">
    <TopBar title="工作区管理" :show-back="true" :is-online="ui.isOnline" :back-to="`/workspaces/${currentAdminWsId}/admin`" />
    <div class="content">
      <div v-if="wsStore.global?.workspaces.length === 0" class="empty">暂无工作区，点击右下角加号创建</div>
      <div v-for="w in wsStore.global?.workspaces ?? []" :key="w.workspaceId" class="ws-card">
        <template v-if="editingId === w.workspaceId">
          <label>名称<input v-model="editName" maxlength="40" /></label>
          <label>描述<textarea v-model="editDesc" rows="2" maxlength="200" /></label>
          <label>GistId<input :value="w.todosGistId" readonly /></label>
          <div class="card-actions">
            <button class="btn-cancel" @click="cancelEdit">取消</button>
            <button class="btn-primary" :disabled="!editName.trim()" @click="saveEdit(w.workspaceId)">保存</button>
          </div>
        </template>
        <template v-else>
          <div class="ws-head">
            <span class="ws-name">{{ w.name }}</span>
            <span class="ws-id">{{ w.workspaceId }}</span>
          </div>
          <p class="ws-desc">{{ w.description || '（无描述）' }}</p>
          <p class="ws-meta">GistId: {{ w.todosGistId }}</p>
          <div class="card-actions">
            <button class="btn-text" @click="startEdit(w)">编辑</button>
            <button class="btn-danger" @click="onDelete(w.workspaceId, w.name)">删除</button>
          </div>
        </template>
      </div>
    </div>
    <button class="fab" @click="showCreate = true" title="新建工作区">+</button>

    <div v-if="showCreate" class="dialog-overlay" @click.self="showCreate = false">
      <div class="dialog">
        <h3>新建工作区</h3>
        <label>名称<input v-model="newName" maxlength="40" placeholder="例：软件谷小学" /></label>
        <label>描述<textarea v-model="newDesc" rows="2" maxlength="200" placeholder="可选" /></label>
        <div class="dialog-actions">
          <button class="btn-cancel" @click="showCreate = false">取消</button>
          <button class="btn-primary" :disabled="!newName.trim()" @click="onCreate">创建</button>
        </div>
      </div>
    </div>

    <LoadingSpinner :visible="ui.loading" :text="loadingText" />
    <ErrorToast :message="ui.error" @close="ui.clearError()" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkspaceStore } from '../stores/workspace'
import { useUiStore } from '../stores/ui'
import {
  createAdditionalWorkspace,
  updateWorkspaceConfig,
  deleteWorkspace,
} from '../services/workspace'
import TopBar from '../components/common/TopBar.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import ErrorToast from '../components/common/ErrorToast.vue'
import type { WorkspaceConfig } from '../types'

const route = useRoute()
const wsStore = useWorkspaceStore()
const ui = useUiStore()

/** 当前 admin 上下文的 workspaceId（用于 TopBar 返回路径）。 */
const currentAdminWsId = computed(() => String(route.params.id))

const editingId = ref<string | null>(null)
const editName = ref('')
const editDesc = ref('')

const showCreate = ref(false)
const newName = ref('')
const newDesc = ref('')

const loadingText = ref('处理中...')

function startEdit(w: WorkspaceConfig) {
  editingId.value = w.workspaceId
  editName.value = w.name
  editDesc.value = w.description ?? ''
}

function cancelEdit() {
  editingId.value = null
  editName.value = ''
  editDesc.value = ''
}

async function saveEdit(id: string) {
  if (!editName.value.trim()) return
  ui.setLoading(true)
  loadingText.value = '保存中...'
  try {
    await updateWorkspaceConfig(id, { name: editName.value, description: editDesc.value })
    cancelEdit()
  } catch (e: any) {
    ui.setError(`保存失败: ${e}`)
  } finally {
    ui.setLoading(false)
  }
}

async function onCreate() {
  if (!newName.value.trim()) return
  ui.setLoading(true)
  loadingText.value = '创建工作区...'
  try {
    await createAdditionalWorkspace({ name: newName.value, description: newDesc.value })
    showCreate.value = false
    newName.value = ''
    newDesc.value = ''
  } catch (e: any) {
    ui.setError(`创建失败: ${e}`)
  } finally {
    ui.setLoading(false)
  }
}

async function onDelete(id: string, name: string) {
  if (!confirm(`确认删除工作区「${name}」？\n（远端 todos gist 不会被删除，仅从全局配置中移除）`)) return
  ui.setLoading(true)
  loadingText.value = '删除中...'
  try {
    await deleteWorkspace(id)
  } catch (e: any) {
    ui.setError(`删除失败: ${e}`)
  } finally {
    ui.setLoading(false)
  }
}
</script>

<style scoped>
.ws-mgmt-page { min-height: 100vh; background: #f8f9fa; padding-bottom: 80px; }
.content { padding: 12px; }
.empty { text-align: center; color: #999; padding: 40px 20px; }
.ws-card {
  background: #fff; border: 1px solid #e0e0e0; border-radius: 12px;
  padding: 14px 16px; margin-bottom: 12px;
}
.ws-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.ws-name { font-size: 16px; font-weight: 600; color: #333; }
.ws-id { font-size: 11px; color: #999; }
.ws-desc { color: #666; font-size: 13px; margin: 6px 0; }
.ws-meta { color: #999; font-size: 12px; margin: 4px 0; word-break: break-all; }
.card-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px; }
.ws-card label { display: block; font-size: 13px; color: #555; margin-top: 8px; }
.ws-card input, .ws-card textarea {
  width: 100%; padding: 8px; margin-top: 4px;
  border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; font-family: inherit;
}
.ws-card input[readonly] { background: #f5f5f5; color: #888; }
.btn-text { border: none; background: transparent; color: #4A90D9; cursor: pointer; padding: 6px 8px; }
.btn-danger { border: 1px solid #E74C3C; background: #fff; color: #E74C3C; padding: 6px 14px; border-radius: 6px; cursor: pointer; }
.btn-primary { border: none; background: #4A90D9; color: #fff; padding: 8px 18px; border-radius: 6px; cursor: pointer; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-cancel { border: 1px solid #ddd; background: #fff; color: #333; padding: 8px 16px; border-radius: 6px; cursor: pointer; }

.fab {
  position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
  border-radius: 50%; border: none; background: #4A90D9; color: #fff; font-size: 28px;
  cursor: pointer; box-shadow: 0 4px 12px rgba(74,144,217,0.4);
}

.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog { background: #fff; border-radius: 12px; padding: 20px; width: 90%; max-width: 380px; }
.dialog h3 { margin: 0 0 12px; font-size: 16px; }
.dialog label { display: block; margin-top: 8px; font-size: 13px; color: #555; }
.dialog input, .dialog textarea {
  width: 100%; padding: 8px; margin-top: 4px;
  border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; font-family: inherit;
}
.dialog-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
