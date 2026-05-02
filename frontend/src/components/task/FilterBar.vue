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
        <button :class="{ active: localFilter.viewMode === 'active' }" @click="setViewMode('active')">进行中</button>
        <button :class="{ active: localFilter.viewMode === 'done' }" @click="setViewMode('done')">完成</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { Role, TaskFilter } from '../../types'

const props = defineProps<{ role: Role; filter: TaskFilter }>()
const emit = defineEmits<{ 'update:filter': [filter: TaskFilter] }>()

const localFilter = reactive<TaskFilter>({ ...props.filter })
watch(() => props.filter, f => Object.assign(localFilter, f))

function emitFilter() { emit('update:filter', { ...localFilter }) }
function setViewMode(mode: 'active' | 'done') { localFilter.viewMode = mode; emitFilter() }
</script>

<style scoped>
.filter-bar { display: flex; gap: 8px; padding: 8px 16px; overflow-x: auto; }
.filter-select { padding: 6px 12px; border: 1px solid #eee; border-radius: 8px; font-size: 14px; background: #fff; }
.view-switch { display: flex; gap: 4px; background: #f5f5f5; border-radius: 8px; padding: 2px; }
.view-switch button { padding: 6px 16px; border: none; border-radius: 6px; font-size: 14px; background: transparent; cursor: pointer; }
.view-switch button.active { background: #4A90D9; color: #fff; }
</style>
