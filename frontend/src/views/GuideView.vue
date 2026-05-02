<template>
  <div class="guide-page">
    <h1 class="app-title">MyTodos</h1>
    <p class="app-sub">团队待办事项协作</p>
    <RoleSelector v-model="selectedRole" />
    <div v-if="selectedRole" class="pw-section">
      <PasswordInput :error="error" @complete="onPasswordComplete" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import RoleSelector from '../components/guide/RoleSelector.vue'
import PasswordInput from '../components/guide/PasswordInput.vue'
import type { Role } from '../types'

const auth = useAuthStore()
const router = useRouter()
const selectedRole = ref<Role | null>(null)
const error = ref<string | null>(null)

async function onPasswordComplete(pw: string) {
  if (!selectedRole.value) return
  error.value = null
  await auth.login(selectedRole.value, pw)
  router.replace('/workspaces')
}
</script>

<style scoped>
.guide-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  background: #f8f9fa;
}
.app-title { font-size: 32px; color: #4A90D9; margin-bottom: 4px; }
.app-sub { color: #666; margin-bottom: 32px; }
.pw-section { margin-top: 32px; width: 100%; max-width: 320px; }
</style>
