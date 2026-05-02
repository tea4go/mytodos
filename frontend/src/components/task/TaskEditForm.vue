<template>
  <div class="task-edit-form">
    <label>标题 <input v-model="form.title" maxlength="80" /></label>
    <label>描述 <textarea v-model="form.description" maxlength="256" rows="3" /></label>
    <label>截止日期 <input v-model="form.dueAt" type="datetime-local" /></label>
    <label>优先级
      <select v-model="form.priority">
        <option value="low">低</option>
        <option value="medium">中</option>
        <option value="high">高</option>
      </select>
    </label>
    <label>状态
      <select v-model="form.status">
        <option value="todo">待办</option>
        <option value="doing">进行中</option>
        <option value="done">已完成</option>
      </select>
    </label>
    <label>指派人
      <select v-model="form.assigneeId">
        <option v-for="m in members" :key="m.memberId" :value="m.memberId">{{ m.displayName }}</option>
      </select>
    </label>
    <div class="form-actions">
      <button @click="$emit('cancel')" class="btn-cancel">取消</button>
      <button @click="submit" :disabled="!valid">保存</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import type { Task, Member } from '../../types'

const props = defineProps<{ task: Task; members: Member[] }>()
const emit = defineEmits<{ save: [task: Task]; cancel: [] }>()

const form = reactive<Task>({ ...props.task })
const valid = computed(() => form.title.trim().length > 0)

function submit() { emit('save', { ...form }) }
</script>

<style scoped>
.task-edit-form label { display: block; margin: 12px 0 4px; font-size: 14px; }
.task-edit-form input, .task-edit-form textarea, .task-edit-form select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; box-sizing: border-box; }
.form-actions { display: flex; gap: 12px; margin-top: 16px; justify-content: flex-end; }
.btn-cancel { background: #eee; color: #333; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
.form-actions button:not(.btn-cancel) { background: #4A90D9; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
.form-actions button:disabled { opacity: 0.5; }
</style>
