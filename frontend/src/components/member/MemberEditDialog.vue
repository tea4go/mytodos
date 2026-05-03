<template>
  <div v-if="visible" class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog">
      <h3>{{ member ? '编辑成员' : '新增成员' }}</h3>
      <label>名称 <input v-model="displayName" maxlength="40" /></label>
      <label v-if="!member">角色
        <select v-model="role">
          <option value="parent">家长</option>
          <option value="student">学生</option>
          <option value="admin">管理员</option>
        </select>
      </label>
      <label>
        {{ member ? '重置密码（留空则不修改）' : '密码（6位数字）' }}
        <input v-model="password" maxlength="6" :placeholder="member ? '留空保持原密码' : '6 位数字'" />
      </label>
      <label>归属工作区
        <div class="btn-group" role="radiogroup" aria-label="归属工作区">
          <button type="button" role="radio"
            :aria-checked="selectedWorkspaceId === null"
            :class="['group-btn', { active: selectedWorkspaceId === null }]"
            @click="selectedWorkspaceId = null">全局</button>
          <button v-for="ws in workspaces" :key="ws.workspaceId" type="button" role="radio"
            :aria-checked="selectedWorkspaceId === ws.workspaceId"
            :class="['group-btn', { active: selectedWorkspaceId === ws.workspaceId }]"
            @click="selectedWorkspaceId = ws.workspaceId">{{ ws.name }}</button>
        </div>
      </label>
      <p v-if="error" class="error">{{ error }}</p>
      <div class="dialog-actions">
        <button @click="$emit('close')" class="btn-cancel">取消</button>
        <button @click="submit" :disabled="!valid">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useWorkspaceStore } from '../../stores/workspace'
import type { Member, Role } from '../../types'

const props = defineProps<{ visible: boolean; member?: Member | null }>()
const emit = defineEmits<{ close: []; save: [data: { displayName: string; role: Role; password?: string; workspaceId: string | null }] }>()

const wsStore = useWorkspaceStore()
const displayName = ref('')
const role = ref<Role>('student')
const password = ref('')
const selectedWorkspaceId = ref<string | null>(null)
const error = ref('')

const workspaces = computed(() => wsStore.workspaces)

watch(() => props.member, m => {
  if (m) { displayName.value = m.displayName; role.value = m.role; password.value = ''; selectedWorkspaceId.value = m.workspaceId }
  else { displayName.value = ''; role.value = 'student'; password.value = '123456'; selectedWorkspaceId.value = null }
  error.value = ''
}, { immediate: true })

const valid = computed(() => {
  if (!displayName.value.trim()) return false
  if (!props.member) return /^\d{6}$/.test(password.value)
  return password.value === '' || /^\d{6}$/.test(password.value)
})

function submit() {
  if (!valid.value) {
    error.value = props.member ? '密码须为 6 位数字或留空' : '密码须为 6 位数字'
    return
  }
  const payload: { displayName: string; role: Role; password?: string; workspaceId: string | null } = {
    displayName: displayName.value.trim(),
    role: role.value,
    workspaceId: selectedWorkspaceId.value,
  }
  if (password.value) payload.password = password.value
  emit('save', payload)
}
</script>

<style scoped>
.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog { background: #fff; border-radius: 16px; padding: 24px; width: 90%; max-width: 360px; }
.dialog label { display: block; margin: 12px 0 4px; font-size: 14px; }
.dialog input, .dialog select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; box-sizing: border-box; }
.btn-group { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.group-btn { padding: 6px 12px; border: 1px solid #ddd; border-radius: 8px; background: #fff; cursor: pointer; font-size: 13px; transition: all 0.15s; }
.group-btn.active { background: #4A90D9; color: #fff; border-color: #4A90D9; }
.dialog-actions { display: flex; gap: 12px; margin-top: 16px; justify-content: flex-end; }
.dialog-actions button { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; background: #4A90D9; color: #fff; }
.btn-cancel { background: #eee !important; color: #333 !important; }
.error { color: #E74C3C; font-size: 13px; margin: 8px 0 0; }
</style>
