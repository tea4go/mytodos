<template>
  <div class="task-list-page">
    <TopBar title="任务" :is-online="ui.isOnline" :show-logout="auth.role === 'student'" @logout="onLogout" />
    <SearchBar v-model="taskStore.searchKeyword" />
    <FilterBar v-if="auth.role" :role="auth.role" :filter="taskStore.filter" @update:filter="updateFilter" />
    <div class="list">
      <TaskItem
        v-for="t in taskStore.filteredTasks"
        :key="t.taskId"
        :task="t"
        :can-complete="canComplete(t)"
        :assignee-name="getMemberName(t.assigneeId)"
        :get-tag-color="getTagColor"
        @click="goDetail"
        @toggle="toggleDone"
      />
      <p v-if="taskStore.filteredTasks.length === 0" class="empty">暂无任务</p>
    </div>
    <AddTaskButton v-if="auth.role === 'parent'" @click="showCreate = true" />
    <div v-if="showCreate" class="dialog-overlay" @click.self="showCreate = false">
      <div class="dialog">
        <h3>新建任务</h3>
        <TaskEditForm :task="newTask" :members="wsStore.members" @save="handleCreate" @cancel="showCreate = false" />
      </div>
    </div>
    <LoadingSpinner :visible="ui.loading" text="保存中..." />
    <ErrorToast :message="ui.error" @close="ui.clearError()" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useWorkspaceStore } from '../stores/workspace'
import { useTaskStore } from '../stores/task'
import { useUiStore } from '../stores/ui'
import TopBar from '../components/common/TopBar.vue'
import SearchBar from '../components/common/SearchBar.vue'
import FilterBar from '../components/task/FilterBar.vue'
import TaskItem from '../components/task/TaskItem.vue'
import AddTaskButton from '../components/task/AddTaskButton.vue'
import TaskEditForm from '../components/task/TaskEditForm.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import ErrorToast from '../components/common/ErrorToast.vue'
import { loadWorkspace, appendTask, saveTaskUpdate } from '../services/sync'
import type { Task, TaskFilter } from '../types'

const auth = useAuthStore()
const wsStore = useWorkspaceStore()
const taskStore = useTaskStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()
const showCreate = ref(false)

function emptyTask(): Task {
  const now = new Date().toISOString()
  return {
    taskId: `task_${Date.now()}`,
    title: '', description: '',
    status: 'todo', priority: 'medium',
    dueAt: '', assigneeId: '',
    tagIds: [], startedAt: null,
    createdAt: now, createdBy: auth.currentMemberId ?? '',
    updatedAt: now, updatedBy: auth.currentMemberId ?? '',
    completedAt: null, completedBy: null,
    deletedAt: null, deletedBy: null,
  }
}
const newTask = ref<Task>(emptyTask())

onMounted(async () => {
  if (wsStore.currentGistId) {
    try { await loadWorkspace(wsStore.currentGistId) } catch { /* error already shown */ }
  }
})

function updateFilter(f: TaskFilter) { taskStore.filter = f }

function getMemberName(id: string): string {
  return wsStore.members.find(m => m.memberId === id)?.displayName ?? '未指派'
}
function getTagColor(tagId: string): string {
  return wsStore.tags.find(t => t.tagId === tagId)?.color ?? '#ccc'
}
function canComplete(t: Task): boolean {
  return auth.role === 'student' && t.assigneeId === auth.currentMemberId
}

function goDetail(taskId: string) {
  router.push(`/workspaces/${route.params.id}/tasks/${taskId}`)
}

async function toggleDone(taskId: string) {
  if (!wsStore.currentGistId) return
  const t = taskStore.tasks.find(x => x.taskId === taskId)
  if (!t) return
  const now = new Date().toISOString()
  const updates: Partial<Task> = t.status === 'done'
    ? { status: 'doing', completedAt: null, completedBy: null, updatedAt: now, updatedBy: auth.currentMemberId ?? '' }
    : { status: 'done', completedAt: now, completedBy: auth.currentMemberId ?? '', updatedAt: now, updatedBy: auth.currentMemberId ?? '' }
  await saveTaskUpdate(wsStore.currentGistId, taskId, updates)
}

async function handleCreate(task: Task) {
  if (!wsStore.currentGistId) return
  await appendTask(wsStore.currentGistId, task)
  showCreate.value = false
  newTask.value = emptyTask()
}

async function onLogout() {
  await auth.logout()
  router.replace('/guide')
}
</script>

<style scoped>
.task-list-page { min-height: 100vh; padding-bottom: 80px; }
.list { background: #fff; }
.empty { text-align: center; color: #999; padding: 40px; }
.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog { background: #fff; border-radius: 16px; padding: 24px; width: 90%; max-width: 400px; max-height: 90vh; overflow-y: auto; }
</style>
