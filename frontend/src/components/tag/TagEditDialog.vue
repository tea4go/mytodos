<template>
  <div v-if="visible" class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog">
      <h3>{{ tag ? '编辑标签' : '新建标签' }}</h3>
      <label>名称 <input v-model="name" maxlength="20" placeholder="标签名" /></label>
      <label>颜色 <input v-model="color" type="color" /></label>
      <div class="dialog-actions">
        <button @click="$emit('close')" class="btn-cancel">取消</button>
        <button @click="submit" :disabled="!name.trim()">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Tag } from '../../types'

const props = defineProps<{ visible: boolean; tag?: Tag | null }>()
const emit = defineEmits<{ close: []; save: [data: { name: string; color: string }] }>()

const name = ref('')
const color = ref('#4A90D9')

watch(() => props.tag, (t) => {
  if (t) { name.value = t.name; color.value = t.color }
  else { name.value = ''; color.value = '#4A90D9' }
}, { immediate: true })

function submit() { emit('save', { name: name.value.trim(), color: color.value }) }
</script>

<style scoped>
.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog { background: #fff; border-radius: 16px; padding: 24px; width: 90%; max-width: 360px; }
.dialog label { display: block; margin: 12px 0 4px; font-size: 14px; }
.dialog input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; box-sizing: border-box; }
.dialog-actions { display: flex; gap: 12px; margin-top: 16px; justify-content: flex-end; }
.dialog-actions button { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; background: #4A90D9; color: #fff; }
.btn-cancel { background: #eee !important; color: #333 !important; }
</style>
