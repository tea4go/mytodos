<template>
  <div class="search-bar">
    <input v-model="keyword" placeholder="搜索任务..." @input="$emit('update:modelValue', keyword)" type="text" />
    <button v-if="keyword" @click="clear" class="clear-btn">✕</button>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const keyword = ref(props.modelValue)
watch(() => props.modelValue, v => { keyword.value = v })
function clear() { keyword.value = ''; emit('update:modelValue', '') }
</script>
<style scoped>
.search-bar { position: relative; padding: 8px 16px; }
.search-bar input { width: 100%; padding: 10px 14px; border: 1px solid #eee; border-radius: 10px; font-size: 15px; box-sizing: border-box; background: #f5f5f5; }
.clear-btn { position: absolute; right: 24px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 16px; color: #999; cursor: pointer; }
</style>
