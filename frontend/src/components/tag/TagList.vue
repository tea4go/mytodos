<template>
  <div class="tag-list">
    <div v-for="tag in tags" :key="tag.tagId" class="tag-row">
      <span class="tag-color" :style="{ background: tag.color }" />
      <span class="tag-name">{{ tag.name }}</span>
      <button @click="$emit('edit', tag)" class="btn-sm">编辑</button>
      <button @click="$emit('delete', tag.tagId)" class="btn-sm btn-danger">删除</button>
    </div>
    <p v-if="tags.length === 0" class="empty">暂无标签</p>
  </div>
</template>

<script setup lang="ts">
import type { Tag } from '../../types'
defineProps<{ tags: Tag[] }>()
defineEmits<{ edit: [tag: Tag]; delete: [tagId: string] }>()
</script>

<style scoped>
.tag-row { display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0; gap: 10px; }
.tag-color { width: 20px; height: 20px; border-radius: 6px; }
.tag-name { flex: 1; font-size: 16px; }
.btn-sm { padding: 4px 12px; border: 1px solid #ddd; border-radius: 6px; background: #fff; cursor: pointer; font-size: 13px; }
.btn-danger { color: #E74C3C; border-color: #E74C3C; }
.empty { text-align: center; color: #999; margin-top: 40px; }
</style>
