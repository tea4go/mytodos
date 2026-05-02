<template>
  <div v-if="visible" class="dialog-overlay" @click.self="cancel">
    <div class="dialog">
      <h3>加入工作区</h3>

      <!-- 第 1 步：输入 gistId -->
      <template v-if="step === 'gist'">
        <label>
          gistId
          <input v-model="gistId" placeholder="例：abc123def456" />
        </label>
        <p v-if="error" class="error">{{ error }}</p>
        <div class="dialog-actions">
          <button class="btn-cancel" @click="cancel">取消</button>
          <button :disabled="!gistId.trim() || loading" @click="loadMembers">
            {{ loading ? '加载中...' : '下一步' }}
          </button>
        </div>
      </template>

      <!-- 第 2 步：选择成员 -->
      <template v-else-if="step === 'member'">
        <p class="hint">在该工作区选择你对应的成员条目：</p>
        <div class="member-list">
          <button
            v-for="m in members"
            :key="m.memberId"
            class="member-item"
            :class="{ active: pickedMemberId === m.memberId }"
            @click="pickedMemberId = m.memberId"
          >
            <span class="role-badge" :class="m.role">{{ roleText(m.role) }}</span>
            <span class="name">{{ m.displayName }}</span>
          </button>
        </div>
        <p v-if="members.length === 0" class="empty">该工作区暂无成员</p>
        <div class="dialog-actions">
          <button class="btn-cancel" @click="step = 'gist'">返回</button>
          <button :disabled="!pickedMemberId" @click="step = 'password'">下一步</button>
        </div>
      </template>

      <!-- 第 3 步：输入密码 -->
      <template v-else-if="step === 'password'">
        <p class="hint">输入「{{ pickedMember?.displayName }}」的 6 位数字密码：</p>
        <PasswordInput :error="error" @complete="onPasswordComplete" />
        <div class="dialog-actions">
          <button class="btn-cancel" @click="step = 'member'">返回</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { fetchGist, parseMetaFromGist } from '../../services/api'
import PasswordInput from './PasswordInput.vue'
import type { Member, Role, WorkspaceMeta } from '../../types'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  close: []
  joined: [data: { workspaceId: string; gistId: string; member: Member; password: string; meta: WorkspaceMeta }]
}>()

type Step = 'gist' | 'member' | 'password'
const step = ref<Step>('gist')
const gistId = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const members = ref<Member[]>([])
const meta = ref<WorkspaceMeta | null>(null)
const pickedMemberId = ref<string | null>(null)

const pickedMember = computed(() => members.value.find(m => m.memberId === pickedMemberId.value) ?? null)

watch(() => props.visible, v => {
  if (v) reset()
})

function reset() {
  step.value = 'gist'
  gistId.value = ''
  loading.value = false
  error.value = null
  members.value = []
  meta.value = null
  pickedMemberId.value = null
}

function cancel() {
  emit('close')
}

async function loadMembers() {
  if (!gistId.value.trim()) return
  loading.value = true
  error.value = null
  try {
    const gist = await fetchGist(gistId.value.trim())
    const m = parseMetaFromGist(gist)
    meta.value = m
    members.value = m.members
    step.value = 'member'
  } catch (e: any) {
    error.value = `无法加载工作区: ${e}`
  } finally {
    loading.value = false
  }
}

function onPasswordComplete(pw: string) {
  if (!pickedMember.value || !meta.value) return
  if (pickedMember.value.password !== pw) {
    error.value = '密码错误'
    return
  }
  emit('joined', {
    workspaceId: meta.value.workspace.workspaceId,
    gistId: gistId.value.trim(),
    member: pickedMember.value,
    password: pw,
    meta: meta.value,
  })
}

function roleText(r: Role) {
  switch (r) { case 'admin': return '管理员'; case 'parent': return '家长'; case 'student': return '学生' }
}
</script>

<style scoped>
.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog { background: #fff; border-radius: 16px; padding: 24px; width: 90%; max-width: 400px; }
.dialog label { display: block; margin: 12px 0 4px; font-size: 14px; color: #333; }
.dialog input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; box-sizing: border-box; }
.dialog-actions { display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end; }
.dialog-actions button { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; background: #4A90D9; color: #fff; }
.dialog-actions button:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-cancel { background: #eee !important; color: #333 !important; }
.error { color: #E74C3C; font-size: 13px; margin-top: 8px; }
.hint { color: #555; font-size: 14px; margin: 8px 0 12px; }
.member-list { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; }
.member-item { display: flex; align-items: center; gap: 10px; padding: 12px; border: 1px solid #ddd; border-radius: 8px; background: #fff; cursor: pointer; text-align: left; }
.member-item.active { border-color: #4A90D9; background: #EBF3FC; }
.role-badge { padding: 2px 8px; border-radius: 8px; font-size: 12px; }
.role-badge.admin { background: #EBF3FC; color: #4A90D9; }
.role-badge.parent { background: #FFF3CD; color: #F5A623; }
.role-badge.student { background: #E8F5E9; color: #27AE60; }
.name { font-size: 15px; }
.empty { text-align: center; color: #999; padding: 20px; }
</style>
