<template>
  <div v-if="visible" class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog">
      <h3>创建工作区</h3>
      <label>名称 <input v-model="name" maxlength="100" placeholder="例：一中实验初中" /></label>
      <label>描述 <input v-model="description" placeholder="可选" maxlength="200" /></label>
      <p v-if="error" class="error">{{ error }}</p>
      <div class="dialog-actions">
        <button @click="$emit('close')" class="btn-cancel">取消</button>
        <button @click="submit" :disabled="!valid">创建</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  close: []
  create: [data: { name: string; description: string }]
}>()

const name = ref('')
const description = ref('')
const error = ref('')

const valid = computed(() => name.value.trim().length > 0)

function submit() {
  if (!valid.value) return
  emit('create', {
    name: name.value.trim(),
    description: description.value.trim(),
  })
}
</script>

<style scoped>
.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog { background: #fff; border-radius: 16px; padding: 24px; width: 90%; max-width: 400px; }
.dialog label { display: block; margin: 12px 0 4px; font-size: 14px; color: #333; }
.dialog input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; box-sizing: border-box; }
.dialog-actions { display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end; }
.dialog-actions button { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; background: #4A90D9; color: #fff; }
.btn-cancel { background: #eee !important; color: #333 !important; }
.error { color: #E74C3C; font-size: 14px; }
</style>
