<template>
  <div class="task-detail-page">
    <TopBar title="任务详情" :show-back="true" :is-online="ui.isOnline" />
    <div v-if="!task" class="empty">任务不存在</div>
    <template v-else>
      <div v-if="!editing" class="detail-view">
        <h2>{{ task.title }}</h2>
        <p class="desc">{{ task.description || '（无描述）' }}</p>
        <div class="info-row"><span>状态</span><strong>{{ statusText(task.status) }}</strong></div>
        <div class="info-row"><span>优先级</span><strong>{{ priorityText(task.priority) }}</strong></div>
        <div class="info-row"><span>截止</span><strong>{{ task.dueAt ? formatDateTime(task.dueAt) : '—' }}</strong></div>
        <div class="info-row"><span>指派</span><strong>{{ assigneeName }}</strong></div>
        <div class="info-row">
          <span>开始时间</span>
          <strong>
            {{ task.startedAt ? formatDateTime(task.startedAt) : '—' }}
            <span v-if="task.startedAt" class="elapsed">{{ elapsedText }}</span>
          </strong>
        </div>
        <div class="info-row"><span>完成时间</span><strong>{{ task.completedAt ? formatDateTime(task.completedAt) : '—' }}</strong></div>
        <div class="info-row">
          <span>标签</span>
          <strong>
            <template v-if="taskTags.length">
              <span
                v-for="t in taskTags"
                :key="t.tagId"
                class="tag-chip"
                :style="{ background: t.color }"
              >{{ t.name }}</span>
            </template>
            <template v-else>—</template>
          </strong>
        </div>

        <div class="action-bar">
          <template v-if="auth.role === 'student' && task.assigneeId === auth.currentMemberId">
            <button v-if="task.status === 'todo'" @click="actionStart" class="primary">开始</button>
            <button v-if="task.status === 'doing'" @click="actionComplete" class="primary">完成</button>
            <button v-if="task.status === 'done'" @click="actionRecover">恢复</button>
          </template>
          <button v-if="auth.role === 'parent'" @click="editing = true" class="primary">编辑</button>
          <button v-if="auth.role === 'parent'" @click="actionDelete" class="danger">删除</button>
        </div>
      </div>
      <div v-else class="edit-view">
        <TaskEditForm :task="task" :members="wsStore.members" @save="handleSave" @cancel="editing = false" />
      </div>
    </template>
    <LoadingSpinner :visible="ui.loading" text="保存中..." />
    <ErrorToast :message="ui.error" @close="ui.clearError()" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useWorkspaceStore } from '../stores/workspace'
import { useTaskStore } from '../stores/task'
import { useUiStore } from '../stores/ui'
import TopBar from '../components/common/TopBar.vue'
import TaskEditForm from '../components/task/TaskEditForm.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import ErrorToast from '../components/common/ErrorToast.vue'
import { saveTaskUpdate, loadWorkspace } from '../services/sync'
import { formatDateTime } from '../utils/date'
import type { Task, TaskStatus, Priority } from '../types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const wsStore = useWorkspaceStore()
const taskStore = useTaskStore()
const ui = useUiStore()
const editing = ref(false)

const task = computed(() => taskStore.tasks.find(t => t.taskId === route.params.taskId))
const assigneeName = computed(() => wsStore.members.find(m => m.memberId === task.value?.assigneeId)?.displayName ?? '未指派')
const taskTags = computed(() => {
  const ids = task.value?.tagIds ?? []
  return ids
    .map(id => wsStore.tags.find(t => t.tagId === id))
    .filter((t): t is NonNullable<typeof t> => !!t)
})

const nowTick = ref(Date.now())
let timer: number | undefined
onMounted(() => { timer = window.setInterval(() => { nowTick.value = Date.now() }, 60_000) })
onUnmounted(() => { if (timer) window.clearInterval(timer) })

function formatDuration(ms: number): string {
  if (ms < 0) ms = 0
  const min = Math.floor(ms / 60_000)
  if (min < 60) return `${min}分钟`
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h < 24) return m === 0 ? `${h}小时` : `${h}小时${m}分钟`
  const d = Math.floor(h / 24)
  const rh = h % 24
  return rh === 0 ? `${d}天` : `${d}天${rh}小时`
}

const elapsedText = computed(() => {
  if (!task.value?.startedAt) return ''
  const start = new Date(task.value.startedAt).getTime()
  const end = task.value.completedAt ? new Date(task.value.completedAt).getTime() : nowTick.value
  const label = task.value.completedAt ? '耗时' : '已过'
  return `（${label}${formatDuration(end - start)}）`
})

onMounted(async () => {
  if (taskStore.tasks.length === 0 && wsStore.currentGistId) {
    try { await loadWorkspace(wsStore.currentGistId) } catch { /* ignore */ }
  }
})

function statusText(s: TaskStatus) { return s === 'todo' ? '待办' : s === 'doing' ? '进行中' : '已完成' }
function priorityText(p: Priority) { return p === 'low' ? '低' : p === 'medium' ? '中' : '高' }

function meta() { return { updatedAt: new Date().toISOString(), updatedBy: auth.currentMemberId ?? '' } }

async function actionStart() {
  if (!task.value || !wsStore.currentGistId) return
  await saveTaskUpdate(wsStore.currentGistId, task.value.taskId, { status: 'doing', startedAt: new Date().toISOString(), ...meta() })
}
async function actionComplete() {
  if (!task.value || !wsStore.currentGistId) return
  const now = new Date().toISOString()
  await saveTaskUpdate(wsStore.currentGistId, task.value.taskId, { status: 'done', completedAt: now, completedBy: auth.currentMemberId ?? '', updatedAt: now, updatedBy: auth.currentMemberId ?? '' })
}
async function actionRecover() {
  if (!task.value || !wsStore.currentGistId) return
  await saveTaskUpdate(wsStore.currentGistId, task.value.taskId, { status: 'doing', completedAt: null, completedBy: null, ...meta() })
}
async function actionDelete() {
  if (!task.value || !wsStore.currentGistId) return
  if (!confirm('确认删除任务？')) return
  const now = new Date().toISOString()
  await saveTaskUpdate(wsStore.currentGistId, task.value.taskId, { deletedAt: now, deletedBy: auth.currentMemberId ?? '', updatedAt: now, updatedBy: auth.currentMemberId ?? '' })
  router.back()
}
async function handleSave(updated: Task) {
  if (!wsStore.currentGistId) return
  await saveTaskUpdate(wsStore.currentGistId, updated.taskId, { ...updated, ...meta() })
  editing.value = false
}
</script>

<style scoped>
.task-detail-page { min-height: 100vh; padding-bottom: 24px; }
.detail-view, .edit-view { padding: 16px; }
.detail-view h2 { margin-bottom: 8px; }
.desc { color: #666; line-height: 1.6; margin-bottom: 16px; }
.info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.info-row span { color: #999; }
.info-row .elapsed { color: #999; font-weight: normal; margin-left: 6px; font-size: 13px; }
.info-row .tag-chip { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 10px; color: #fff; font-size: 12px; line-height: 18px; margin-left: 6px; }
.info-row .tag-chip:first-child { margin-left: 0; }
.action-bar { display: flex; gap: 12px; margin-top: 24px; }
.action-bar button { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; background: #fff; cursor: pointer; font-size: 15px; }
.action-bar button.primary { background: #4A90D9; color: #fff; border-color: #4A90D9; }
.action-bar button.danger { color: #E74C3C; border-color: #E74C3C; }
.empty { text-align: center; padding: 60px; color: #999; }
</style>
