<template>
  <div class="guide-page">
    <!-- 首启向导：无工作区 或 无 admin -->
    <template v-if="needsSetup">
      <div class="header">
        <h2 class="title">MyTodos</h2>
      </div>

      <!-- 第一步：创建工作区 -->
      <template v-if="wizardStep === 1">
        <p class="hint">欢迎使用！请先创建一个工作区：</p>
        <div class="setup-form">
          <label>工作区名称 <input v-model="wsName" maxlength="100" placeholder="例：一中实验初中" /></label>
          <label>描述 <input v-model="wsDesc" placeholder="可选" maxlength="200" /></label>
          <button class="btn-primary" :disabled="!wsName.trim()" @click="onCreateWorkspace">创建工作区</button>
        </div>
      </template>

      <!-- 第二步：创建初始管理员 -->
      <template v-else-if="wizardStep === 2">
        <p class="hint">工作区已创建！请设置管理员：</p>
        <div class="setup-form">
          <label>管理员名称 <input v-model="adminName" maxlength="40" placeholder="例：老王" /></label>
          <label>密码 <input v-model="adminPassword" maxlength="6" placeholder="6 位数字" /></label>
          <label>归属工作区
            <div class="btn-group" role="radiogroup" aria-label="归属工作区">
              <button type="button" role="radio"
                :aria-checked="adminWorkspaceId === null"
                :class="['group-btn', { active: adminWorkspaceId === null }]"
                @click="adminWorkspaceId = null">全局</button>
              <button v-for="ws in wsStore.workspaces" :key="ws.workspaceId" type="button" role="radio"
                :aria-checked="adminWorkspaceId === ws.workspaceId"
                :class="['group-btn', { active: adminWorkspaceId === ws.workspaceId }]"
                @click="adminWorkspaceId = ws.workspaceId">{{ ws.name }}</button>
            </div>
          </label>
          <button class="btn-primary" :disabled="!adminValid" @click="onCreateAdmin">完成设置</button>
        </div>
      </template>
    </template>

    <!-- 正常登录：有工作区且有 admin -->
    <template v-else>
      <div class="header">
        <h2 class="title">MyTodos</h2>
        <button class="admin-btn" :class="{ disabled: !adminAvailable }" :title="adminAvailable ? '管理员入口' : '暂无管理员'" @click="adminAvailable && (showAdminDialog = true)">⚙️</button>
      </div>

      <template v-if="step === 'pick'">
        <p v-if="normalMembers.length > 0" class="hint">请选择登录成员：</p>
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
        <p v-if="normalMembers.length === 0" class="empty">
          暂无家长/学生成员<br>请通过右上角管理员入口登录后添加
        </p>
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
    </template>

    <LoadingSpinner :visible="ui.loading" text="处理中..." />
    <ErrorToast :message="ui.error" @close="ui.clearError()" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useWorkspaceStore } from '../stores/workspace'
import { useUiStore } from '../stores/ui'
import PasswordInput from '../components/guide/PasswordInput.vue'
import AdminLoginDialog from '../components/workspace/AdminLoginDialog.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import ErrorToast from '../components/common/ErrorToast.vue'
import { createWorkspace, createInitialAdmin } from '../services/workspace'
import type { Member, Role } from '../types'

const router = useRouter()
const auth = useAuthStore()
const wsStore = useWorkspaceStore()
const ui = useUiStore()

// ===== 首启向导状态 =====
const wizardStep = ref(1)
const wsName = ref('')
const wsDesc = ref('')
const adminName = ref('')
const adminPassword = ref('')
const adminWorkspaceId = ref<string | null>(null)
const createdWorkspaceId = ref<string | null>(null)
const createdGistId = ref<string | null>(null)

const needsSetup = computed(() =>
  wsStore.workspaces.length === 0 || !wsStore.members.some(m => m.role === 'admin'),
)

// ===== 正常登录状态 =====
type Step = 'pick' | 'password'
const step = ref<Step>('pick')
const pickedMember = ref<Member | null>(null)
const error = ref<string | null>(null)
const showAdminDialog = ref(false)
const pwInputKey = ref(0)

const normalMembers = computed<Member[]>(() =>
  wsStore.members.filter(m => m.role !== 'admin'),
)

const adminAvailable = computed(() =>
  wsStore.members.some(m => m.role === 'admin'),
)

const adminValid = computed(() =>
  adminName.value.trim().length > 0 && /^\d{6}$/.test(adminPassword.value),
)

// ===== 首启向导逻辑 =====
async function onCreateWorkspace() {
  if (!wsName.value.trim()) return
  ui.setLoading(true)
  try {
    const result = await createWorkspace({ name: wsName.value.trim(), description: wsDesc.value.trim() })
    createdWorkspaceId.value = result.workspaceId
    createdGistId.value = result.gistId
    // 默认归属刚创建的工作区
    adminWorkspaceId.value = result.workspaceId
    wizardStep.value = 2
  } catch (e: any) {
    ui.setError(`创建工作区失败: ${e}`)
  } finally {
    ui.setLoading(false)
  }
}

async function onCreateAdmin() {
  if (!adminValid.value) return
  ui.setLoading(true)
  try {
    const member = await createInitialAdmin({
      displayName: adminName.value.trim(),
      password: adminPassword.value,
      workspaceId: adminWorkspaceId.value,
    })
    const wsId = createdWorkspaceId.value ?? wsStore.workspaces[0]?.workspaceId ?? ''
    const gistId = createdGistId.value ?? wsStore.workspaces[0]?.gistId ?? ''
    await auth.login({
      workspaceId: wsId,
      gistId,
      member,
      password: adminPassword.value,
    })
    router.replace(`/workspaces/${wsId}/admin`)
  } catch (e: any) {
    ui.setError(`创建管理员失败: ${e}`)
  } finally {
    ui.setLoading(false)
  }
}

// ===== 正常登录逻辑 =====
function resolveTargetWorkspace(): { workspaceId: string; gistId: string } | null {
  const list = wsStore.workspaces
  if (list.length === 0) return null
  const lastId = wsStore.currentWorkspaceId ?? localStorage.getItem('current_workspace_id')
  const ws = list.find(w => w.workspaceId === lastId) ?? list[0]
  return { workspaceId: ws.workspaceId, gistId: ws.gistId }
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
  if (!pickedMember.value) return
  if (pickedMember.value.password !== pw) {
    error.value = '密码错误'
    pwInputKey.value++
    return
  }
  const target = resolveTargetWorkspace()
  if (!target) {
    ui.setError('暂无工作区，请通过管理员登录后创建')
    return
  }
  await auth.login({
    workspaceId: target.workspaceId,
    gistId: target.gistId,
    member: pickedMember.value,
    password: pw,
  })
  router.replace(`/workspaces/${target.workspaceId}/tasks`)
}

async function onAdminLogin(payload: { member: Member; password: string }) {
  const target = resolveTargetWorkspace()
  await auth.login({
    workspaceId: target?.workspaceId ?? '',
    gistId: target?.gistId ?? '',
    member: payload.member,
    password: payload.password,
  })
  showAdminDialog.value = false
  if (target) router.replace(`/workspaces/${target.workspaceId}/admin`)
  else router.replace('/workspaces')
}

function roleText(r: Role) {
  switch (r) { case 'admin': return '管理员'; case 'parent': return '家长'; case 'student': return '学生' }
}
</script>

<style scoped>
.guide-page { min-height: 100vh; padding: 16px; background: #f8f9fa; }
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-top: 12px; }
.title { flex: 1; font-size: 24px; color: #4A90D9; margin: 0; text-align: center; font-weight: 600; }
.admin-btn { width: 40px; height: 40px; border: 1px solid #ddd; background: #fff; border-radius: 50%; font-size: 18px; cursor: pointer; }
.admin-btn.disabled { opacity: 0.4; cursor: not-allowed; }
.hint { color: #555; font-size: 14px; margin: 12px 0; text-align: center; }
.member-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; padding: 8px; }
.member-card {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 24px 12px; border: 2px solid #ddd; border-radius: 12px; background: #fff; cursor: pointer;
}
.member-card:hover { border-color: #4A90D9; background: #EBF3FC; }
.role-badge { padding: 2px 8px; border-radius: 8px; font-size: 12px; }
.role-badge.parent { background: #FFF3CD; color: #F5A623; }
.role-badge.student { background: #E8F5E9; color: #27AE60; }
.role-badge.admin { background: #EBF3FC; color: #4A90D9; }
.name { font-size: 16px; color: #333; }
.empty { text-align: center; color: #999; padding: 40px 20px; line-height: 1.8; }
.actions { text-align: center; margin-top: 16px; }
.btn-cancel { padding: 8px 20px; border: 1px solid #ddd; background: #fff; border-radius: 8px; cursor: pointer; }

/* 首启向导表单 */
.setup-form { max-width: 360px; margin: 0 auto; }
.setup-form label { display: block; margin: 12px 0 4px; font-size: 14px; color: #333; }
.setup-form input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; box-sizing: border-box; }
.btn-primary { width: 100%; padding: 12px; margin-top: 20px; border: none; border-radius: 8px; background: #4A90D9; color: #fff; font-size: 16px; cursor: pointer; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-group { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.group-btn { padding: 6px 12px; border: 1px solid #ddd; border-radius: 8px; background: #fff; cursor: pointer; font-size: 13px; transition: all 0.15s; }
.group-btn.active { background: #4A90D9; color: #fff; border-color: #4A90D9; }
</style>
