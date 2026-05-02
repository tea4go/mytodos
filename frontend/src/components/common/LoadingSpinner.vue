<template>
  <div v-if="visible" class="loading-overlay">
    <div class="spinner" />
    <p v-if="text">{{ text }}</p>
  </div>
</template>
<script setup lang="ts">
defineProps<{ visible: boolean; text?: string }>()
</script>
<style scoped>
.loading-overlay { position: fixed; inset: 0; background: rgba(255,255,255,0.8); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 999; }
.spinner { width: 40px; height: 40px; border: 4px solid #eee; border-top-color: #4A90D9; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
