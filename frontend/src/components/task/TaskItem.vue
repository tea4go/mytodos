<template>
  <div :class="['task-item', `priority-${task.priority}`]" @click="$emit('click', task.taskId)">
    <div class="task-left">
      <button
        v-if="canComplete"
        :class="['check-btn', { done: task.status === 'done' }]"
        @click.stop="$emit('toggle', task.taskId)"
      >
        {{ task.status === 'done' ? '✓' : '○' }}
      </button>
      <div class="task-info">
        <span :class="['title', { completed: task.status === 'done' }]">{{ task.title }}</span>
        <div class="meta">
          <span v-if="task.dueAt" :class="['due', { overdue: isOverdue(task.dueAt) && task.status !== 'done' }]">
            {{ formatDateTime(task.dueAt) }}
          </span>
          <span class="assignee">{{ assigneeName }}</span>
        </div>
      </div>
    </div>
    <div class="task-right">
      <span :class="['status-badge', task.status]">{{ statusText }}</span>
      <div class="tags" v-if="task.tagIds.length">
        <span v-for="tid in task.tagIds.slice(0,2)" :key="tid" class="tag-dot" :style="{ background: getTagColor(tid) }" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Task } from '../../types'
import { formatDateTime, isOverdue } from '../../utils/date'

const props = defineProps<{
  task: Task
  canComplete: boolean
  assigneeName: string
  getTagColor: (tagId: string) => string
}>()

defineEmits<{ click: [taskId: string]; toggle: [taskId: string] }>()

const statusText = computed(() => {
  switch (props.task.status) { case 'todo': return '待办'; case 'doing': return '进行中'; case 'done': return '已完成' }
})
</script>

<style scoped>
.task-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
.task-item.priority-high { border-left: 3px solid #E74C3C; }
.task-item.priority-medium { border-left: 3px solid #F5A623; }
.task-item.priority-low { border-left: 3px solid #B8B8B8; }
.task-left { display: flex; align-items: center; gap: 12px; flex: 1; }
.check-btn { font-size: 22px; background: none; border: none; cursor: pointer; color: #ccc; }
.check-btn.done { color: #27AE60; }
.title { font-size: 16px; display: block; }
.title.completed { text-decoration: line-through; color: #999; }
.meta { display: flex; gap: 8px; margin-top: 4px; font-size: 12px; color: #888; }
.due.overdue { color: #E74C3C; font-weight: 500; }
.status-badge { font-size: 12px; padding: 2px 8px; border-radius: 10px; }
.status-badge.todo { background: #EBF3FC; color: #4A90D9; }
.status-badge.doing { background: #FFF3CD; color: #F5A623; }
.status-badge.done { background: #E8F5E9; color: #27AE60; }
.task-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.tags { display: flex; gap: 4px; }
.tag-dot { width: 8px; height: 8px; border-radius: 50%; }
</style>
