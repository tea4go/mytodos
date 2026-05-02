<template>
  <div v-if="visible" class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog">
      <h3>创建工作区</h3>
      <label>名称 <input v-model="name" maxlength="100" placeholder="例：一中实验初中" /></label>
      <label>描述 <input v-model="description" placeholder="可选" maxlength="200" /></label>
      <label>管理员口令 <input v-model="pwAdmin" maxlength="6" placeholder="6位数字" /></label>
      <label>家长口令 <input v-model="pwParent" maxlength="6" placeholder="6位数字" /></label>
      <label>学生口令 <input v-model="pwStudent" maxlength="6" placeholder="6位数字" /></label>
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
  create: [data: { name: string; description: string; passwords: { admin: string; parent: string; student: string } }]
}>()

const name = ref('')
const description = ref('')
const pwAdmin = ref('123456')
const pwParent = ref('234567')
const pwStudent = ref('345678')
const error = ref('')

const valid = computed(() => name.value.trim() && pwAdmin.value.length === 6 && pwParent.value.length === 6 && pwStudent.value.length === 6)

function submit() {
  if (!valid.value) return
  emit('create', {
    name: name.value.trim(),
    description: description.value.trim(),
    passwords: { admin: pwAdmin.value, parent: pwParent.value, student: pwStudent.value },
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
