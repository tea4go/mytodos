<template>
  <button @click="$emit('click')" class="add-btn">+</button>
</template>
<script setup lang="ts">
defineEmits<{ click: [] }>()
</script>
<style scoped>
.add-btn {
  position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
  border-radius: 50%; border: none; background: #4A90D9; color: #fff;
  font-size: 28px; cursor: pointer; box-shadow: 0 4px 12px rgba(74,144,217,0.4);
}
</style>
