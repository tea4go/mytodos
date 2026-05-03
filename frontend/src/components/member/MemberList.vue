<template>
  <div class="member-list">
    <div v-for="m in members" :key="m.memberId" class="member-row">
      <span class="role-badge" :class="m.role">{{ roleText(m.role) }}</span>
      <span class="member-name">{{ m.displayName }}</span>
      <span class="ws-badge" :class="{ global: !m.workspaceId }">{{ workspaceName(m.workspaceId) }}</span>
      <button @click="$emit('edit', m)" class="btn-sm">编辑</button>
      <button @click="$emit('remove', m.memberId)" class="btn-sm btn-danger">移除</button>
    </div>
    <p v-if="members.length === 0" class="empty">暂无成员</p>
  </div>
</template>

<script setup lang="ts">
import { useWorkspaceStore } from '../../stores/workspace'
import type { Member, Role } from '../../types'

defineProps<{ members: Member[] }>()
defineEmits<{ edit: [m: Member]; remove: [id: string] }>()

const wsStore = useWorkspaceStore()

function roleText(r: Role) { switch (r) { case 'admin': return '管理员'; case 'parent': return '家长'; case 'student': return '学生' } }

function workspaceName(workspaceId: string | null): string {
  if (!workspaceId) return '全局'
  return wsStore.workspaces.find(w => w.workspaceId === workspaceId)?.name ?? '未知'
}
</script>

<style scoped>
.member-row { display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0; gap: 10px; }
.role-badge { padding: 2px 8px; border-radius: 8px; font-size: 12px; }
.role-badge.admin { background: #EBF3FC; color: #4A90D9; }
.role-badge.parent { background: #FFF3CD; color: #F5A623; }
.role-badge.student { background: #E8F5E9; color: #27AE60; }
.member-name { flex: 1; font-size: 16px; }
.ws-badge { padding: 2px 8px; border-radius: 8px; font-size: 11px; background: #F0F0F0; color: #666; white-space: nowrap; }
.ws-badge.global { background: #E8F5E9; color: #27AE60; }
.btn-sm { padding: 4px 12px; border: 1px solid #ddd; border-radius: 6px; background: #fff; cursor: pointer; font-size: 13px; }
.btn-danger { color: #E74C3C; border-color: #E74C3C; }
.empty { text-align: center; color: #999; margin-top: 40px; }
</style>
