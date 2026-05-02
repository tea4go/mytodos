<template>
  <div v-if="visible" class="dialog-overlay" @click.self="cancel">
    <div class="dialog">
      <h3>管理员登录</h3>
      <template v-if="adminMember">
        <p class="hint">输入管理员「{{ adminMember.displayName }}」的 6 位口令：</p>
        <PasswordInput :key="pwKey" :error="error" @complete="onComplete" />
        <div class="actions">
          <button class="btn-cancel" @click="cancel">取消</button>
        </div>
      </template>
      <template v-else>
        <p class="empty">未配置管理员，请联系开发者</p>
        <div class="actions">
          <button class="btn-cancel" @click="cancel">关闭</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import PasswordInput from '../guide/PasswordInput.vue'
import type { Member } from '../../types'

const props = defineProps<{ visible: boolean; members: Member[] }>()
const emit = defineEmits<{
  close: []
  success: [data: { member: Member; password: string }]
}>()

const error = ref<string | null>(null)
const pwKey = ref(0)

const adminMember = computed<Member | null>(() =>
  props.members.find(m => m.role === 'admin') ?? null,
)

watch(() => props.visible, v => {
  if (v) { error.value = null; pwKey.value++ }
})

function cancel() { emit('close') }

function onComplete(pw: string) {
  if (!adminMember.value) return
  if (adminMember.value.password !== pw) {
    error.value = '密码错误'
    pwKey.value++
    return
  }
  emit('success', { member: adminMember.value, password: pw })
}
</script>

<style scoped>
.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog { background: #fff; border-radius: 16px; padding: 24px; width: 90%; max-width: 360px; }
.hint { color: #555; font-size: 14px; margin: 8px 0 16px; }
.empty { text-align: center; color: #999; padding: 20px; }
.actions { text-align: center; margin-top: 16px; }
.btn-cancel { padding: 8px 20px; border: 1px solid #ddd; background: #fff; border-radius: 8px; cursor: pointer; }
</style>
