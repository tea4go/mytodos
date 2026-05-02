<template>
  <div v-if="visible" class="dialog-overlay" @click.self="cancel">
    <div class="dialog">
      <h3>加入工作区</h3>
      <label>
        gistId
        <input v-model="gistId" placeholder="例：abc123def456" />
      </label>
      <p v-if="error" class="error">{{ error }}</p>
      <div class="dialog-actions">
        <button class="btn-cancel" @click="cancel">取消</button>
        <button :disabled="!gistId.trim() || loading" @click="loadAndJoin">
          {{ loading ? '加载中...' : '加入' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { fetchGist, parseMetaFromGist } from '../../services/api'
import type { WorkspaceMeta } from '../../types'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  close: []
  joined: [data: { workspaceId: string; gistId: string; meta: WorkspaceMeta }]
}>()

const gistId = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

watch(() => props.visible, v => {
  if (v) reset()
})

function reset() {
  gistId.value = ''
  loading.value = false
  error.value = null
}

function cancel() {
  emit('close')
}

async function loadAndJoin() {
  if (!gistId.value.trim()) return
  loading.value = true
  error.value = null
  try {
    const gist = await fetchGist(gistId.value.trim())
    const meta = parseMetaFromGist(gist)
    emit('joined', {
      workspaceId: meta.workspace.workspaceId,
      gistId: gistId.value.trim(),
      meta,
    })
  } catch (e: any) {
    error.value = `无法加载工作区: ${e}`
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog { background: #fff; border-radius: 16px; padding: 24px; width: 90%; max-width: 400px; }
.dialog label { display: block; margin: 12px 0 4px; font-size: 14px; color: #333; }
.dialog input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; box-sizing: border-box; }
.dialog-actions { display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end; }
.dialog-actions button { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; background: #4A90D9; color: #fff; }
.dialog-actions button:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-cancel { background: #eee !important; color: #333 !important; }
.error { color: #E74C3C; font-size: 13px; margin-top: 8px; }
</style>
