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
      <div class="btn-group" role="radiogroup" aria-label="状态">
        <button
          v-for="opt in statusOptions"
          :key="opt.value"
          type="button"
          role="radio"
          :aria-checked="form.status === opt.value"
          :class="['group-btn', `s-${opt.value}`, { active: form.status === opt.value }]"
          @click="form.status = opt.value"
        >{{ opt.label }}</button>
      </div>
    </label>
    <label>指派人
      <div class="btn-group" role="radiogroup" aria-label="指派人">
        <button
          v-for="m in studentMembers"
          :key="m.memberId"
          type="button"
          role="radio"
          :aria-checked="form.assigneeId === m.memberId"
          :class="['group-btn', { active: form.assigneeId === m.memberId }]"
          @click="form.assigneeId = m.memberId"
        >{{ m.displayName }}</button>
      </div>
    </label>
    <label>标签
      <div class="btn-group tag-group" role="radiogroup" aria-label="标签">
        <button
          v-for="t in tags"
          :key="t.tagId"
          type="button"
          role="radio"
          :aria-checked="selectedTagId === t.tagId"
          :class="['group-btn', 'tag-btn', { active: selectedTagId === t.tagId }]"
          :style="selectedTagId === t.tagId ? { background: t.color, borderColor: t.color, color: '#fff' } : { borderColor: t.color, color: t.color }"
          @click="selectedTagId = t.tagId"
        >{{ t.name }}</button>
      </div>
    </label>
    <div class="form-actions">
      <button @click="$emit('cancel')" class="btn-cancel">取消</button>
      <button @click="submit" :disabled="!valid">保存</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import type { Task, Member, Tag, Priority, TaskStatus } from '../../types'
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
const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: '待办' },
  { value: 'doing', label: '进行中' },
  { value: 'done', label: '已完成' },
]
const selectedTagId = computed<string>({
  get: () => form.tagIds[0] ?? '',
  set: (v: string) => { form.tagIds = v ? [v] : [] },
})
const valid = computed(() => form.title.trim().length > 0 && form.tagIds.length > 0)

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
.btn-group { display: flex; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
.group-btn { padding: 8px 14px; border: 1px solid #ddd; background: #fff; border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.15s; }
.group-btn.active { background: #4A90D9; color: #fff; border-color: #4A90D9; }
.group-btn.s-todo.active { background: #4A90D9; color: #fff; border-color: #4A90D9; }
.group-btn.s-doing.active { background: #F5A623; color: #fff; border-color: #F5A623; }
.group-btn.s-done.active { background: #27AE60; color: #fff; border-color: #27AE60; }
.tag-group { gap: 6px; }
.tag-btn { padding: 6px 12px; font-size: 13px; }
.tag-btn.active { background: #4A90D9; color: #fff; border-color: #4A90D9; }
.form-actions { display: flex; gap: 12px; margin-top: 16px; justify-content: flex-end; }
.btn-cancel { background: #eee; color: #333; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
.form-actions button:not(.btn-cancel) { background: #4A90D9; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
.form-actions button:disabled { opacity: 0.5; }
</style>
