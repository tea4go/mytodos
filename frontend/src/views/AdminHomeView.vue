<template>
  <div class="admin-home-page">
    <TopBar :title="wsStore.meta?.workspace.name ?? '管理员主页'" :is-online="ui.isOnline" />
    <div class="content">
      <p class="role-info">当前身份：管理员（{{ currentDisplayName }}）</p>
      <div class="entries">
        <button class="entry-btn" @click="go('members')">
          <span class="icon">👥</span>
          <span class="label">成员管理</span>
          <span class="desc">添加、编辑、移除工作区成员</span>
        </button>
        <button class="entry-btn" @click="go('tags')">
          <span class="icon">🏷️</span>
          <span class="label">标签管理</span>
          <span class="desc">维护任务可用的标签集合</span>
        </button>
        <button class="entry-btn" @click="go('settings')">
          <span class="icon">⚙️</span>
          <span class="label">工作区设置</span>
          <span class="desc">编辑工作区名称、描述与查看 gistId</span>
        </button>
      </div>
    </div>
    <button class="logout-btn" @click="logout">退出登录</button>
    <LoadingSpinner :visible="ui.loading" text="加载中..." />
    <ErrorToast :message="ui.error" @close="ui.clearError()" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useWorkspaceStore } from '../stores/workspace'
import { useUiStore } from '../stores/ui'
import { loadWorkspace } from '../services/sync'
import TopBar from '../components/common/TopBar.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import ErrorToast from '../components/common/ErrorToast.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const wsStore = useWorkspaceStore()
const ui = useUiStore()

const workspaceId = computed(() => String(route.params.id))

const currentDisplayName = computed(() => {
  const m = wsStore.meta?.members.find(x => x.memberId === auth.currentMemberId)
  return m?.displayName ?? '-'
})

onMounted(async () => {
  if (!wsStore.meta && wsStore.currentGistId) {
    try { await loadWorkspace(wsStore.currentGistId) } catch { /* ignore */ }
  }
})

function go(target: 'members' | 'tags' | 'settings') {
  router.push(`/workspaces/${workspaceId.value}/${target}`)
}

async function logout() {
  await auth.logout()
  router.replace(`/workspaces/${workspaceId.value}/login`)
}
</script>

<style scoped>
.admin-home-page { min-height: 100vh; padding-bottom: 80px; background: #f8f9fa; }
.content { padding: 16px; }
.role-info { color: #666; font-size: 13px; margin: 8px 4px 16px; }
.entries { display: flex; flex-direction: column; gap: 12px; }
.entry-btn {
  display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
  padding: 18px 20px; border: 1px solid #e0e0e0; border-radius: 12px; background: #fff;
  cursor: pointer; text-align: left;
}
.entry-btn:hover { border-color: #4A90D9; background: #EBF3FC; }
.entry-btn .icon { font-size: 24px; }
.entry-btn .label { font-size: 16px; font-weight: 600; color: #333; }
.entry-btn .desc { font-size: 13px; color: #666; }
.logout-btn {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  padding: 10px 32px; border: 1px solid #ddd; background: #fff; border-radius: 24px; cursor: pointer;
}
</style>
