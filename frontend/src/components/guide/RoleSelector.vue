<template>
  <div class="role-selector">
    <h2>选择角色</h2>
    <div class="role-options">
      <button
        v-for="r in roles"
        :key="r.value"
        :class="['role-btn', { active: modelValue === r.value }]"
        @click="$emit('update:modelValue', r.value)"
      >
        <span class="role-icon">{{ r.icon }}</span>
        <span class="role-label">{{ r.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Role } from '../../types'

defineProps<{ modelValue: Role | null }>()
defineEmits<{ 'update:modelValue': [value: Role] }>()

const roles = [
  { value: 'admin' as Role, label: '管理员', icon: '⚙️' },
  { value: 'parent' as Role, label: '家长', icon: '👨‍👩‍👧' },
  { value: 'student' as Role, label: '学生', icon: '📚' },
]
</script>

<style scoped>
.role-selector { text-align: center; }
.role-options { display: flex; gap: 12px; justify-content: center; margin-top: 24px; }
.role-btn {
  padding: 16px 24px; border: 2px solid #ddd; border-radius: 12px;
  background: #fff; cursor: pointer; display: flex; flex-direction: column; align-items: center;
}
.role-btn.active { border-color: #4A90D9; background: #EBF3FC; }
.role-icon { font-size: 32px; }
.role-label { margin-top: 8px; font-size: 16px; font-weight: 500; }
</style>
