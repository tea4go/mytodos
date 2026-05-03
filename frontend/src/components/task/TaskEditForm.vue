<template>
  <div class="task-edit-form">
    <label>标题 <input v-model="form.title" maxlength="80" /></label>
    <label>描述 <textarea v-model="form.description" maxlength="256" rows="3" /></label>
    <label>截止日期 <input v-model="form.dueAt" type="datetime-local" /></label>
    <label>优先级
      <div class="priority-group" role="radiogroup" aria-label="优先级">
        <button
          v-for="opt in priorityOptions"
          :key="opt.value"
          type="button"
          role="radio"
          :aria-checked="form.priority === opt.value"
          :class="['priority-btn', `p-${opt.value}`, { active: form.priority === opt.value }]"
          @click="form.priority = opt.value"
        >{{ opt.label }}</button>
      </div>
    </label>
    <label v-if="!hideStatus">状态
      <select v-model="form.status">
        <option value="todo">待办</option>
        <option value="doing">进行中</option>
        <option value="done">已完成</option>
      </select>
    </label>
    <label>指派人
      <select v-model="form.assigneeId">
        <option v-for="m in studentMembers" :key="m.memberId" :value="m.memberId">{{ m.displayName }}</option>
      </select>
    </label>
    <label>标签
      <select v-model="selectedTagId">
        <option value="">（无）</option>
        <option v-for="t in tags" :key="t.tagId" :value="t.tagId">{{ t.name }}</option>
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
import type { Task, Member, Tag, Priority } from '../../types'
import { useWorkspaceStore } from '../../stores/workspace'

const props = defineProps<{ task: Task; members: Member[]; hideStatus?: boolean; tags?: Tag[] }>()
const emit = defineEmits<{ save: [task: Task]; cancel: [] }>()

const wsStore = useWorkspaceStore()
const form = reactive<Task>({ ...props.task })
const studentMembers = computed(() => props.members.filter(m => m.role === 'student'))
const tags = computed<Tag[]>(() => props.tags ?? wsStore.tags)
const priorityOptions: { value: Priority; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
]
const selectedTagId = computed<string>({
  get: () => form.tagIds[0] ?? '',
  set: (v: string) => { form.tagIds = v ? [v] : [] },
})
const valid = computed(() => form.title.trim().length > 0)

function submit() { emit('save', { ...form }) }
</script>

<style scoped>
.task-edit-form label { display: block; margin: 12px 0 4px; font-size: 14px; }
.task-edit-form input, .task-edit-form textarea, .task-edit-form select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; box-sizing: border-box; }
.priority-group { display: flex; gap: 8px; margin-top: 4px; }
.priority-btn { flex: 1; padding: 10px 0; border: 1px solid #ddd; background: #fff; border-radius: 8px; font-size: 15px; cursor: pointer; transition: all 0.15s; }
.priority-btn.active.p-low { background: #B8B8B8; color: #fff; border-color: #B8B8B8; }
.priority-btn.active.p-medium { background: #F5A623; color: #fff; border-color: #F5A623; }
.priority-btn.active.p-high { background: #E74C3C; color: #fff; border-color: #E74C3C; }
.form-actions { display: flex; gap: 12px; margin-top: 16px; justify-content: flex-end; }
.btn-cancel { background: #eee; color: #333; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
.form-actions button:not(.btn-cancel) { background: #4A90D9; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
.form-actions button:disabled { opacity: 0.5; }
</style>
