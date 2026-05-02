<template>
  <div class="filter-bar">
    <template v-if="role === 'parent'">
      <select v-model="localFilter.status" @change="emitFilter" class="filter-select">
        <option :value="null">全部状态</option>
        <option value="todo">待办</option>
        <option value="doing">进行中</option>
        <option value="done">已完成</option>
      </select>
      <select v-model="localFilter.dueDate" @change="emitFilter" class="filter-select">
        <option :value="null">全部时间</option>
        <option value="today">今天</option>
        <option value="week">本周</option>
        <option value="overdue">逾期</option>
      </select>
    </template>
    <template v-if="role === 'student'">
      <div class="view-switch">
        <button :class="{ active: localFilter.status === 'todo' }" @click="setStatus('todo')">
          待办<span v-if="counts.todo > 0" class="badge">{{ counts.todo }}</span>
        </button>
        <button :class="{ active: localFilter.status === 'doing' }" @click="setStatus('doing')">
          进行中<span v-if="counts.doing > 0" class="badge">{{ counts.doing }}</span>
        </button>
        <button :class="{ active: localFilter.status === 'done' }" @click="setStatus('done')">
          完成<span v-if="counts.done > 0" class="badge">{{ counts.done }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from 'vue'
import type { Role, TaskFilter, TaskStatus } from '../../types'
import { useTaskStore } from '../../stores/task'
import { useAuthStore } from '../../stores/auth'

const props = defineProps<{ role: Role; filter: TaskFilter }>()
const emit = defineEmits<{ 'update:filter': [filter: TaskFilter] }>()

const taskStore = useTaskStore()
const auth = useAuthStore()

const localFilter = reactive<TaskFilter>({ ...props.filter })
watch(() => props.filter, f => Object.assign(localFilter, f))

const counts = computed(() => {
  let list = taskStore.tasks.filter(t => !t.deletedAt)
  if (auth.role === 'student') list = list.filter(t => t.assigneeId === auth.currentMemberId)
  return {
    todo: list.filter(t => t.status === 'todo').length,
    doing: list.filter(t => t.status === 'doing').length,
    done: list.filter(t => t.status === 'done').length,
  }
})

function emitFilter() { emit('update:filter', { ...localFilter }) }
function setStatus(s: TaskStatus) {
  localFilter.status = s
  localFilter.viewMode = s === 'done' ? 'done' : 'active'
  emitFilter()
}
</script>

<style scoped>
.filter-bar { display: flex; gap: 8px; padding: 8px 16px; overflow-x: auto; }
.filter-select { padding: 6px 12px; border: 1px solid #eee; border-radius: 8px; font-size: 14px; background: #fff; }
.view-switch { display: flex; gap: 4px; background: #f5f5f5; border-radius: 8px; padding: 2px; }
.view-switch button { padding: 6px 16px; border: none; border-radius: 6px; font-size: 14px; background: transparent; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
.view-switch button.active { background: #4A90D9; color: #fff; }
.view-switch button .badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px;
  background: #E74C3C; color: #fff; font-size: 11px; font-weight: 600; line-height: 1;
}
.view-switch button.active .badge { background: #fff; color: #4A90D9; }
</style>
