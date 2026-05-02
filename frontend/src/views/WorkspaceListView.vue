<template>
  <div class="workspace-list-page">
    <TopBar title="工作区" :is-online="ui.isOnline" />
    <div class="role-info">当前角色: {{ roleText }}</div>
    <div class="content">
      <WorkspaceCard
        v-for="ws in wsStore.workspaces"
        :key="ws.workspaceId"
        :workspace="ws"
        :is-admin="auth.role === 'admin'"
        @select="handleSelect"
      />
      <p v-if="wsStore.workspaces.length === 0" class="empty">暂无工作区，点击右下角加号创建或导入</p>
    </div>
    <button v-if="auth.role === 'admin'" @click="showCreate = true" class="fab">+</button>
    <button @click="logout" class="logout-btn">退出</button>
    <CreateWorkspaceDialog :visible="showCreate" @close="showCreate = false" @create="handleCreate" />
    <LoadingSpinner :visible="ui.loading" text="处理中..." />
    <ErrorToast :message="ui.error" @close="ui.clearError()" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useWorkspaceStore } from '../stores/workspace'
import { useUiStore } from '../stores/ui'
import TopBar from '../components/common/TopBar.vue'
import WorkspaceCard from '../components/workspace/WorkspaceCard.vue'
import CreateWorkspaceDialog from '../components/workspace/CreateWorkspaceDialog.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import ErrorToast from '../components/common/ErrorToast.vue'
import { createGist, serializeMeta, serializeTasks } from '../services/api'
import { loadWorkspace } from '../services/sync'
import type { WorkspaceMeta, Tag } from '../types'

const auth = useAuthStore()
const wsStore = useWorkspaceStore()
const ui = useUiStore()
const router = useRouter()
const showCreate = ref(false)

const roleText = computed(() => {
  switch (auth.role) { case 'admin': return '管理员'; case 'parent': return '家长'; case 'student': return '学生'; default: return '' }
})

onMounted(() => { wsStore.loadList() })

const DEFAULT_TAGS: Omit<Tag, 'createdAt'>[] = [
  { tagId: 'tag_chinese', name: '语文', color: '#E74C3C' },
  { tagId: 'tag_math', name: '数学', color: '#4A90D9' },
  { tagId: 'tag_english', name: '英语', color: '#27AE60' },
  { tagId: 'tag_physics', name: '物理', color: '#9B59B6' },
  { tagId: 'tag_chemistry', name: '化学', color: '#F5A623' },
  { tagId: 'tag_biology', name: '生物', color: '#16A085' },
  { tagId: 'tag_history', name: '历史', color: '#8B4513' },
  { tagId: 'tag_geography', name: '地理', color: '#2C8C99' },
  { tagId: 'tag_politics', name: '政治', color: '#C0392B' },
  { tagId: 'tag_pe', name: '体育', color: '#E67E22' },
  { tagId: 'tag_other', name: '其他', color: '#7F8C8D' },
]

async function handleCreate(data: { name: string; description: string; passwords: { admin: string; parent: string; student: string } }) {
  ui.setLoading(true)
  try {
    const now = new Date().toISOString()
    const workspaceId = `ws_${Date.now()}`
    const meta: WorkspaceMeta = {
      schemaVersion: 1,
      workspace: { workspaceId, name: data.name, description: data.description, createdAt: now, updatedAt: now },
      members: [],
      tags: DEFAULT_TAGS.map(t => ({ ...t, createdAt: now })),
      passwords: data.passwords,
      revision: { remoteRevision: '1' },
    }
    const gist = await createGist(`MyTodos: ${data.name}`, {
      'meta.json': serializeMeta(meta),
      'todos.json': serializeTasks([]),
    })
    wsStore.addWorkspace({ workspaceId, gistId: gist.id, name: data.name })
    showCreate.value = false
  } catch (e: any) {
    ui.setError(`创建失败: ${e}`)
  } finally {
    ui.setLoading(false)
  }
}

async function handleSelect(workspaceId: string) {
  const ws = wsStore.workspaces.find(w => w.workspaceId === workspaceId)
  if (!ws) return
  wsStore.setCurrentWorkspace(ws.workspaceId, ws.gistId)
  try {
    await loadWorkspace(ws.gistId)
  } catch { return }
  if (auth.role === 'admin') {
    router.push(`/workspaces/${workspaceId}/members`)
  } else {
    router.push(`/workspaces/${workspaceId}/tasks`)
  }
}

function logout() {
  auth.logout()
  router.replace('/guide')
}
</script>

<style scoped>
.workspace-list-page { min-height: 100vh; padding-bottom: 80px; }
.role-info { padding: 8px 16px; font-size: 13px; color: #666; background: #f5f5f5; }
.content { padding: 8px 16px; }
.empty { text-align: center; color: #999; margin-top: 40px; }
.fab { position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 50%; border: none; background: #4A90D9; color: #fff; font-size: 28px; cursor: pointer; box-shadow: 0 4px 12px rgba(74,144,217,0.4); }
.logout-btn { position: fixed; bottom: 24px; left: 24px; padding: 10px 20px; border: 1px solid #ddd; background: #fff; border-radius: 8px; cursor: pointer; }
</style>
