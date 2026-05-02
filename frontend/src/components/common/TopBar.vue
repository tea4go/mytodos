<template>
  <div class="top-bar">
    <button v-if="showBack" @click="$router.back()" class="back-btn">←</button>
    <span class="title">{{ title }}</span>
    <span :class="['status-dot', isOnline ? 'online' : 'offline']" />
  </div>
</template>
<script setup lang="ts">
defineProps<{ title: string; showBack?: boolean; isOnline: boolean }>()
</script>
<style scoped>
.top-bar { display: flex; align-items: center; padding: 12px 16px; background: #fff; border-bottom: 1px solid #eee; }
.back-btn { font-size: 20px; background: none; border: none; cursor: pointer; padding: 0 8px 0 0; }
.title { flex: 1; font-size: 18px; font-weight: 600; }
.status-dot { width: 10px; height: 10px; border-radius: 50%; }
.status-dot.online { background: #27AE60; }
.status-dot.offline { background: #E74C3C; }
</style>
