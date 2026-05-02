<template>
  <div class="guide-page">
    <h1 class="app-title">MyTodos</h1>
    <p class="app-sub">团队待办事项协作</p>
    <div class="entries">
      <button class="entry-btn primary" @click="showCreate = true">
        <span class="icon">⚙️</span>
        <span class="label">创建工作区</span>
        <span class="desc">作为管理员发起一个新的团队空间</span>
      </button>
      <button class="entry-btn" @click="showJoin = true">
        <span class="icon">🤝</span>
        <span class="label">加入工作区</span>
        <span class="desc">使用 gistId 加入家庭/团队</span>
      </button>
    </div>

    <CreateWorkspaceDialog
      :visible="showCreate"
      @close="showCreate = false"
      @create="handleCreate"
    />
    <JoinWorkspaceDialog
      :visible="showJoin"
      @close="showJoin = false"
      @joined="handleJoined"
    />
    <LoadingSpinner :visible="ui.loading" :text="loadingText" />
    <ErrorToast :message="ui.error" @close="ui.clearError()" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'
import CreateWorkspaceDialog from '../components/workspace/CreateWorkspaceDialog.vue'
import JoinWorkspaceDialog from '../components/guide/JoinWorkspaceDialog.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import ErrorToast from '../components/common/ErrorToast.vue'
import { createWorkspace } from '../services/workspace'
import { loadWorkspace } from '../services/sync'
import type { Member, WorkspaceMeta } from '../types'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const showCreate = ref(false)
const showJoin = ref(false)
const loadingText = ref('处理中...')

async function handleCreate(data: { name: string; description: string; adminName: string; adminPassword: string }) {
  ui.setLoading(true)
  loadingText.value = '创建工作区...'
  try {
    const result = await createWorkspace(data)
    await auth.login({
      workspaceId: result.workspaceId,
      gistId: result.gistId,
      member: result.adminMember,
      password: data.adminPassword,
    })
    showCreate.value = false
    router.replace('/workspaces')
  } catch (e: any) {
    ui.setError(`创建失败: ${e}`)
  } finally {
    ui.setLoading(false)
  }
}

async function handleJoined(data: { workspaceId: string; gistId: string; member: Member; password: string; meta: WorkspaceMeta }) {
  ui.setLoading(true)
  loadingText.value = '加入工作区...'
  try {
    await auth.login({
      workspaceId: data.workspaceId,
      gistId: data.gistId,
      member: data.member,
      password: data.password,
    })
    // 同步本地工作区列表
    const { useWorkspaceStore } = await import('../stores/workspace')
    const wsStore = useWorkspaceStore()
    wsStore.addWorkspace({ workspaceId: data.workspaceId, gistId: data.gistId, name: data.meta.workspace.name })
    await loadWorkspace(data.gistId)
    showJoin.value = false
    if (data.member.role === 'admin') {
      router.replace('/workspaces')
    } else {
      router.replace(`/workspaces/${data.workspaceId}/tasks`)
    }
  } catch (e: any) {
    ui.setError(`加入失败: ${e}`)
  } finally {
    ui.setLoading(false)
  }
}
</script>

<style scoped>
.guide-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  background: #f8f9fa;
}
.app-title { font-size: 32px; color: #4A90D9; margin-bottom: 4px; }
.app-sub { color: #666; margin-bottom: 48px; }
.entries { display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 360px; }
.entry-btn {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 24px; border: 2px solid #ddd; border-radius: 16px; background: #fff;
  cursor: pointer;
}
.entry-btn.primary { border-color: #4A90D9; background: #EBF3FC; }
.entry-btn .icon { font-size: 32px; }
.entry-btn .label { font-size: 18px; font-weight: 600; color: #333; }
.entry-btn .desc { font-size: 13px; color: #666; }
</style>
