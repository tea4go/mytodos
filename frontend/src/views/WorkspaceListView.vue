<template>
  <div class="workspace-list-page">
    <TopBar title="工作区" :is-online="ui.isOnline" />
    <div class="role-info">
      当前身份：{{ currentMemberDisplay }}（{{ roleText }}）
    </div>
    <div class="content">
      <WorkspaceCard
        v-for="ws in wsStore.workspaces"
        :key="ws.workspaceId"
        :workspace="ws"
        :is-admin="auth.role === 'admin'"
        @select="handleSelect"
      />
      <p v-if="wsStore.workspaces.length === 0" class="empty">暂无工作区，点击右下角加号创建</p>
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
import { createWorkspace } from '../services/workspace'
import { loadWorkspace } from '../services/sync'

const auth = useAuthStore()
const wsStore = useWorkspaceStore()
const ui = useUiStore()
const router = useRouter()
const showCreate = ref(false)

const roleText = computed(() => {
  switch (auth.role) { case 'admin': return '管理员'; case 'parent': return '家长'; case 'student': return '学生'; default: return '' }
})

const currentMemberDisplay = computed(() => {
  const m = wsStore.members.find(x => x.memberId === auth.currentMemberId)
  return m?.displayName ?? auth.currentMemberId ?? '-'
})

onMounted(() => {
  wsStore.loadList()
  if (wsStore.currentGistId && !wsStore.meta) {
    loadWorkspace(wsStore.currentGistId).catch(() => { /* ignore */ })
  }
})

async function handleCreate(data: { name: string; description: string; adminName: string; adminPassword: string }) {
  ui.setLoading(true)
  try {
    const result = await createWorkspace(data)
    // 创建即切换为该工作区的管理员身份
    await auth.login({
      workspaceId: result.workspaceId,
      gistId: result.gistId,
      member: result.adminMember,
      password: data.adminPassword,
    })
    await loadWorkspace(result.gistId)
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
  // 已登录该工作区且为管理员：直接进入成员管理；普通成员：进入任务列表
  if (auth.isLoggedIn && wsStore.currentWorkspaceId === ws.workspaceId) {
    if (auth.role === 'admin') {
      router.push(`/workspaces/${workspaceId}/admin`)
    } else {
      router.push(`/workspaces/${workspaceId}/tasks`)
    }
    return
  }
  // 否则前往该工作区登录页
  router.push(`/workspaces/${workspaceId}/login`)
}

async function logout() {
  const targetWsId = wsStore.currentWorkspaceId
  await auth.logout()
  if (targetWsId) router.replace(`/workspaces/${targetWsId}/login`)
  else router.replace('/workspaces')
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
