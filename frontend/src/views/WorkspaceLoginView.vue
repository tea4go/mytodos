<template>
  <div class="workspace-login-page">
    <div class="header">
      <button class="back-btn" @click="goBack">‹</button>
      <h2 class="title">{{ wsStore.meta?.workspace.name ?? '加载中...' }}</h2>
      <button class="admin-btn" :title="'管理员入口'" @click="showAdminDialog = true">⚙️</button>
    </div>

    <template v-if="step === 'pick'">
      <p class="hint">请选择登录成员：</p>
      <div class="member-grid">
        <button
          v-for="m in normalMembers"
          :key="m.memberId"
          class="member-card"
          @click="pickMember(m)"
        >
          <span class="role-badge" :class="m.role">{{ roleText(m.role) }}</span>
          <span class="name">{{ m.displayName }}</span>
        </button>
      </div>
      <p v-if="wsStore.meta && normalMembers.length === 0" class="empty">该工作区暂无家长/学生成员，请先由管理员添加</p>
    </template>

    <template v-else-if="step === 'password' && pickedMember">
      <p class="hint">输入「{{ pickedMember.displayName }}」的 6 位口令：</p>
      <PasswordInput :key="pwInputKey" :error="error" @complete="onPasswordComplete" />
      <div class="actions">
        <button class="btn-cancel" @click="backToPick">返回</button>
      </div>
    </template>

    <AdminLoginDialog
      :visible="showAdminDialog"
      :members="wsStore.members"
      @close="showAdminDialog = false"
      @success="onAdminLogin"
    />
    <LoadingSpinner :visible="ui.loading" text="处理中..." />
    <ErrorToast :message="ui.error" @close="ui.clearError()" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useWorkspaceStore } from '../stores/workspace'
import { useUiStore } from '../stores/ui'
import { loadWorkspace } from '../services/sync'
import PasswordInput from '../components/guide/PasswordInput.vue'
import AdminLoginDialog from '../components/workspace/AdminLoginDialog.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import ErrorToast from '../components/common/ErrorToast.vue'
import type { Member, Role } from '../types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const wsStore = useWorkspaceStore()
const ui = useUiStore()

type Step = 'pick' | 'password'
const step = ref<Step>('pick')
const pickedMember = ref<Member | null>(null)
const error = ref<string | null>(null)
const showAdminDialog = ref(false)
const pwInputKey = ref(0)

const workspaceId = computed(() => String(route.params.id))

const normalMembers = computed<Member[]>(() =>
  (wsStore.meta?.members ?? []).filter(m => m.role !== 'admin'),
)

onMounted(async () => {
  wsStore.loadList()
  const ws = wsStore.workspaces.find(w => w.workspaceId === workspaceId.value)
  if (!ws) {
    ui.setError('未找到该工作区，请重新加入')
    router.replace('/workspaces')
    return
  }
  if (!wsStore.meta || wsStore.currentGistId !== ws.gistId) {
    try { await loadWorkspace(ws.gistId) } catch { /* error 已由 sync 处理 */ }
  }
})

function pickMember(m: Member) {
  pickedMember.value = m
  error.value = null
  pwInputKey.value++
  step.value = 'password'
}

function backToPick() {
  step.value = 'pick'
  pickedMember.value = null
  error.value = null
}

async function onPasswordComplete(pw: string) {
  if (!pickedMember.value) return
  if (pickedMember.value.password !== pw) {
    error.value = '密码错误'
    pwInputKey.value++
    return
  }
  const ws = wsStore.workspaces.find(w => w.workspaceId === workspaceId.value)
  if (!ws) return
  await auth.login({
    workspaceId: workspaceId.value,
    gistId: ws.gistId,
    member: pickedMember.value,
    password: pw,
  })
  router.replace(`/workspaces/${workspaceId.value}/tasks`)
}

async function onAdminLogin(payload: { member: Member; password: string }) {
  const ws = wsStore.workspaces.find(w => w.workspaceId === workspaceId.value)
  if (!ws) return
  await auth.login({
    workspaceId: workspaceId.value,
    gistId: ws.gistId,
    member: payload.member,
    password: payload.password,
  })
  showAdminDialog.value = false
  router.replace(`/workspaces/${workspaceId.value}/admin`)
}

function goBack() {
  if (step.value === 'password') backToPick()
  else router.replace('/workspaces')
}

function roleText(r: Role) {
  switch (r) { case 'admin': return '管理员'; case 'parent': return '家长'; case 'student': return '学生' }
}
</script>

<style scoped>
.workspace-login-page { min-height: 100vh; padding: 16px; background: #f8f9fa; }
.header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.title { flex: 1; font-size: 18px; color: #333; margin: 0; text-align: center; }
.back-btn { width: 36px; height: 36px; border: none; background: transparent; font-size: 24px; cursor: pointer; color: #4A90D9; }
.admin-btn { width: 36px; height: 36px; border: 1px solid #ddd; background: #fff; border-radius: 50%; font-size: 18px; cursor: pointer; }
.hint { color: #555; font-size: 14px; margin: 12px 0; text-align: center; }
.member-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; padding: 8px; }
.member-card {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 20px 12px; border: 2px solid #ddd; border-radius: 12px; background: #fff; cursor: pointer;
}
.member-card:hover { border-color: #4A90D9; background: #EBF3FC; }
.role-badge { padding: 2px 8px; border-radius: 8px; font-size: 12px; }
.role-badge.parent { background: #FFF3CD; color: #F5A623; }
.role-badge.student { background: #E8F5E9; color: #27AE60; }
.role-badge.admin { background: #EBF3FC; color: #4A90D9; }
.name { font-size: 16px; color: #333; }
.empty { text-align: center; color: #999; padding: 40px 20px; }
.actions { text-align: center; margin-top: 16px; }
.btn-cancel { padding: 8px 20px; border: 1px solid #ddd; background: #fff; border-radius: 8px; cursor: pointer; }
</style>
