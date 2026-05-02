<template>
  <div class="guide-page">
    <div class="header">
      <h2 class="title">MyTodos</h2>
      <button class="admin-btn" title="管理员入口" @click="showAdminDialog = true">⚙️</button>
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

const normalMembers = computed<Member[]>(() =>
  wsStore.members.filter(m => m.role !== 'admin'),
)

/** 选择登录后落地的工作区：优先恢复上次访问的，否则取列表第一个。 */
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
  // 即使没有任何工作区，admin 仍可登录（去工作区列表/创建入口）
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
</style>
