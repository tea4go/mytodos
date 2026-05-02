<template>
  <Transition name="fade">
    <div v-if="message" class="error-toast" @click="$emit('close')">{{ message }}</div>
  </Transition>
</template>
<script setup lang="ts">
defineProps<{ message: string | null }>()
defineEmits<{ close: [] }>()
</script>
<style scoped>
.error-toast {
  position: fixed; bottom: 24px; left: 16px; right: 16px;
  padding: 12px 16px; background: #E74C3C; color: #fff;
  border-radius: 8px; text-align: center; z-index: 1000;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
