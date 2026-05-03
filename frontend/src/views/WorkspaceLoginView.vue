<template>
  <div class="login-page">
    <div class="header">
      <h2 class="title">每日作业</h2>
    </div>

    <template v-if="currentWsId">
      <!-- 管理员入口（仅选人步骤显示） -->
      <div v-if="step === 'pick'" class="admin-bar">
        <button class="admin-btn" :class="{ disabled: !adminAvailable }" :title="adminAvailable ? '管理员入口' : '该工作区暂无管理员'" @click="adminAvailable && (showAdminDialog = true)">⚙️ 管理员</button>
      </div>

      <template v-if="step === 'pick'">
        <p v-if="normalMembers.length > 0" class="hint">请选择登录帐号：</p>
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
        <p v-if="normalMembers.length === 0" class="empty">该工作区暂无家长/学生成员，请先由管理员添加</p>

        <!-- 工作区选择器 -->
        <div v-if="wsStore.workspaces.length > 1" class="ws-switcher">
          <span class="ws-label">切换学校：</span>
          <button
            v-for="ws in wsStore.workspaces"
            :key="ws.workspaceId"
            :class="['ws-btn', { active: currentWsId === ws.workspaceId }]"
            @click="switchWorkspace(ws.workspaceId)"
          >{{ ws.name }}</button>
        </div>
      </template>

      <template v-else-if="step === 'password' && pickedMember">
        <div class="password-section">
          <p class="hint">输入「{{ pickedMember.displayName }}」的 6 位口令：</p>
          <PasswordInput :key="pwInputKey" :error="error" @complete="onPasswordComplete" />
          <div class="actions">
            <button class="btn-cancel" @click="backToPick">返回</button>
          </div>
        </div>
      </template>

      <AdminLoginDialog
        :visible="showAdminDialog"
        :members="adminMembers"
        @close="showAdminDialog = false"
        @success="onAdminLogin"
      />
    </template>

    <LoadingSpinner :visible="ui.loading" text="处理中..." />
    <ErrorToast :message="ui.error" @close="ui.clearError()" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useWorkspaceStore } from '../stores/workspace'
import { useUiStore } from '../stores/ui'
import { loadWorkspace } from '../services/sync'
import PasswordInput from '../components/guide/PasswordInput.vue'
import AdminLoginDialog from '../components/workspace/AdminLoginDialog.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import ErrorToast from '../components/common/ErrorToast.vue'
import type { Member, Role } from '../types'

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

// 当前选中工作区：优先 localStorage 恢复值，否则第一个
const currentWsId = ref<string | null>(null)

const normalMembers = computed<Member[]>(() => {
  const wid = currentWsId.value
  if (!wid) return []
  const list = (wsStore.meta?.members ?? wsStore.members).filter(m =>
    m.role !== 'admin' && (m.workspaceId === wid || m.workspaceId == null),
  )
  // 排序：parent 在前，student 在后；同角色保持原顺序
  const order: Record<Role, number> = { parent: 0, student: 1, admin: 2 }
  return [...list].sort((a, b) => order[a.role] - order[b.role])
})

const adminMembers = computed<Member[]>(() => {
  const wid = currentWsId.value
  if (!wid) return []
  return wsStore.members.filter(m =>
    m.role === 'admin' && (m.workspaceId === wid || m.workspaceId == null),
  )
})

const adminAvailable = computed(() => adminMembers.value.length > 0)

onMounted(async () => {
  // 恢复上次选中的工作区
  wsStore.restoreWorkspace()
  const saved = wsStore.currentWorkspaceId
  if (saved && wsStore.workspaces.some(w => w.workspaceId === saved)) {
    currentWsId.value = saved
  } else if (wsStore.workspaces.length > 0) {
    currentWsId.value = wsStore.workspaces[0].workspaceId
  }
  await loadCurrentWsData()
})

// 切换工作区时加载对应数据并重置步骤
async function switchWorkspace(workspaceId: string) {
  currentWsId.value = workspaceId
  wsStore.setCurrentWorkspace(workspaceId)
  step.value = 'pick'
  pickedMember.value = null
  error.value = null
  await loadCurrentWsData()
}

async function loadCurrentWsData() {
  const wid = currentWsId.value
  if (!wid) return
  const ws = wsStore.workspaces.find(w => w.workspaceId === wid)
  if (!ws) return
  if (!wsStore.meta || wsStore.currentGistId !== ws.gistId) {
    try { await loadWorkspace(ws.gistId) } catch { /* error 已由 sync 处理 */ }
  }
}

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
  if (!pickedMember.value || !currentWsId.value) return
  if (pickedMember.value.password !== pw) {
    error.value = '密码错误'
    pwInputKey.value++
    return
  }
  const ws = wsStore.workspaces.find(w => w.workspaceId === currentWsId.value)
  if (!ws) return
  await auth.login({
    workspaceId: currentWsId.value,
    gistId: ws.gistId,
    member: pickedMember.value,
    password: pw,
  })
  router.replace(`/workspaces/${currentWsId.value}/tasks`)
}

async function onAdminLogin(payload: { member: Member; password: string }) {
  if (!currentWsId.value) return
  const ws = wsStore.workspaces.find(w => w.workspaceId === currentWsId.value)
  if (!ws) return
  await auth.login({
    workspaceId: currentWsId.value,
    gistId: ws.gistId,
    member: payload.member,
    password: payload.password,
  })
  showAdminDialog.value = false
  router.replace(`/workspaces/${currentWsId.value}/admin`)
}

function roleText(r: Role) {
  switch (r) { case 'admin': return '管理员'; case 'parent': return '家长'; case 'student': return '学生' }
}
</script>

<style scoped>
.login-page { min-height: 100vh; padding: 16px; background: #f8f9fa; }
.header { display: flex; align-items: center; justify-content: center; margin-bottom: 12px; padding-top: 8px; }
.title { font-size: 24px; color: #4A90D9; margin: 0; font-weight: 600; }

/* 工作区选择器 */
.ws-switcher { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 4px; margin-top: 24px; }
.ws-label { width: 100%; font-size: 14px; color: #999; }
.ws-btn { padding: 8px 16px; border: 2px solid #ddd; border-radius: 10px; background: #fff; cursor: pointer; font-size: 18px; white-space: nowrap; transition: all 0.15s; }
.ws-btn.active { border-color: #4A90D9; background: #4A90D9; color: #fff; }
.empty-ws { color: #999; font-size: 14px; }

/* 管理员入口 */
.admin-bar { text-align: right; margin-bottom: 12px; }
.admin-btn { padding: 6px 14px; border: 1px solid #ddd; background: #fff; border-radius: 10px; font-size: 13px; cursor: pointer; }
.admin-btn.disabled { opacity: 0.4; cursor: not-allowed; }

.hint { color: #555; font-size: 14px; margin: 12px 0; text-align: center; }
.password-section {
  min-height: calc(100vh - 120px);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 16px;
}
.password-section .hint { font-size: 16px; margin: 0 0 8px; }
.member-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; padding: 8px; }
.member-card {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 20px 12px; border: 2px solid #ddd; border-radius: 12px; background: #fff; cursor: pointer;
}
.member-card:hover { border-color: #4A90D9; background: #EBF3FC; }
.role-badge { padding: 2px 8px; border-radius: 8px; font-size: 18px; }
.role-badge.parent { background: #FFF3CD; color: #F5A623; }
.role-badge.student { background: #E8F5E9; color: #27AE60; }
.role-badge.admin { background: #EBF3FC; color: #4A90D9; }
.name { font-size: 26px; color: #333; }
.empty { text-align: center; color: #999; padding: 40px 20px; }
.actions { text-align: center; margin-top: 16px; }
.btn-cancel { padding: 8px 20px; border: 1px solid #ddd; background: #fff; border-radius: 8px; cursor: pointer; }
</style>
