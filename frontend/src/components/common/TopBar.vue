<template>
  <div class="top-bar">
    <button v-if="showBack" @click="onBack" class="back-btn">←</button>
    <span class="title">{{ title }}</span>
    <span :class="['status-dot', isOnline ? 'online' : 'offline']" />
    <button v-if="showLogout" @click="$emit('logout')" class="logout-btn" title="退出登录">⏻</button>
  </div>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router'
const props = defineProps<{ title: string; showBack?: boolean; isOnline: boolean; backTo?: string; showLogout?: boolean }>()
const emit = defineEmits<{ back: []; logout: [] }>()
const router = useRouter()
function onBack() {
  emit('back')
  if (props.backTo) {
    router.replace(props.backTo)
  } else if (window.history.length > 1) {
    router.back()
  } else {
    router.replace('/workspaces')
  }
}
</script>
<style scoped>
.top-bar { display: flex; align-items: center; padding: 12px 16px; background: #fff; border-bottom: 1px solid #eee; }
.back-btn { font-size: 20px; background: none; border: none; cursor: pointer; padding: 0 8px 0 0; }
.title { flex: 1; font-size: 18px; font-weight: 600; }
.status-dot { width: 10px; height: 10px; border-radius: 50%; }
.status-dot.online { background: #27AE60; }
.status-dot.offline { background: #E74C3C; }
.logout-btn {
  margin-left: 12px; width: 32px; height: 32px; border-radius: 50%;
  border: 1px solid #ddd; background: #fff; cursor: pointer; font-size: 14px; color: #666;
}
.logout-btn:hover { border-color: #E74C3C; color: #E74C3C; }
</style>
