<template>
  <div v-if="releaseStore.dialogOpen" class="upgrade-mask" :class="{ force: isForce }">
    <div class="upgrade-dialog" role="dialog" aria-modal="true">
      <h3 class="title">{{ titleText }}</h3>
      <p class="sub">当前版本 {{ decision.current }} → 新版本 {{ decision.latest }}</p>
      <p v-if="decision.notes" class="notes">
        <a :href="decision.notes" target="_blank" rel="noopener">查看发布说明</a>
      </p>

      <p v-if="!decision.url && isForce" class="warn">
        当前平台暂无升级包<span v-if="decision.platform === 'ios'">，请通过 App Store 升级 MyTodos</span>
        <span v-else>，请联系管理员</span>
      </p>

      <div v-if="state === 'idle'" class="actions">
        <button v-if="decision.url" class="btn-primary" @click="onStart">立即升级</button>
        <button v-if="!isForce" class="btn-cancel" @click="onLater">稍后再说</button>
      </div>

      <div v-else-if="state === 'downloading'" class="progress-area">
        <div class="bar">
          <div class="fill" :style="{ width: percentText }" />
        </div>
        <p class="progress-text">{{ progressText }}</p>
        <div class="actions">
          <button class="btn-cancel" @click="onCancel">取消</button>
        </div>
      </div>

      <div v-else-if="state === 'completed'" class="actions">
        <p class="sub">下载完成，是否打开安装包？</p>
        <button class="btn-primary" @click="onOpen">打开安装包</button>
        <button v-if="!isForce" class="btn-cancel" @click="onLater">稍后</button>
      </div>

      <div v-else-if="state === 'failed'" class="actions">
        <p class="warn">{{ errorText || '下载失败' }}</p>
        <button class="btn-primary" @click="onStart">重试</button>
        <button v-if="!isForce" class="btn-cancel" @click="onLater">稍后再说</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { useReleaseStore } from '../../stores/release'
import { downloadRelease, cancelDownload, openInstaller } from '../../services/release'

const releaseStore = useReleaseStore()
const decision = computed(() => releaseStore.decision)
const isForce = computed(() => decision.value.level === 'force')

type State = 'idle' | 'downloading' | 'completed' | 'failed'
const state = ref<State>('idle')
const received = ref(0)
const total = ref<number | null>(null)
const downloadedPath = ref<string | null>(null)
const errorText = ref<string | null>(null)

const titleText = computed(() => {
  if (isForce.value) return '必须升级到新版本'
  return `发现新版本 ${decision.value.latest ?? ''}`
})

const percentText = computed(() => {
  if (!total.value) return '0%'
  const pct = Math.min(100, Math.floor((received.value / total.value) * 100))
  return `${pct}%`
})

const progressText = computed(() => {
  const r = formatBytes(received.value)
  const t = total.value ? formatBytes(total.value) : '?'
  return `已下载 ${r} / ${t}`
})

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

let unlisten: UnlistenFn | null = null
async function attachProgress() {
  if (unlisten) return
  unlisten = await listen<{ received: number; total: number | null }>('release-download-progress', (e) => {
    received.value = e.payload.received
    total.value = e.payload.total
  })
}

onUnmounted(() => {
  if (unlisten) { unlisten(); unlisten = null }
})

async function onStart() {
  if (!decision.value.url || !decision.value.fileName) return
  errorText.value = null
  received.value = 0
  total.value = null
  state.value = 'downloading'
  await attachProgress()
  try {
    const path = await downloadRelease(decision.value.url, decision.value.fileName)
    downloadedPath.value = path
    state.value = 'completed'
  } catch (e: any) {
    errorText.value = `下载失败：${e}`
    state.value = 'failed'
  }
}

async function onCancel() {
  try { await cancelDownload() } catch { /* ignore */ }
  state.value = 'idle'
}

async function onOpen() {
  if (!downloadedPath.value) return
  try {
    await openInstaller(downloadedPath.value)
  } catch (e: any) {
    errorText.value = `打开失败：${e}`
    state.value = 'failed'
  }
}

function onLater() {
  releaseStore.dismiss()
  state.value = 'idle'
}
</script>

<style scoped>
.upgrade-mask {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 9999;
}
.upgrade-mask.force { background: rgba(0, 0, 0, 0.65); }
.upgrade-dialog {
  width: min(420px, 92vw); background: #fff; border-radius: 12px;
  padding: 20px 22px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
}
.title { margin: 0 0 8px; font-size: 18px; color: #222; }
.sub { margin: 4px 0; font-size: 14px; color: #555; }
.notes { margin: 6px 0; font-size: 13px; }
.notes a { color: #4A90D9; text-decoration: none; }
.warn { margin: 8px 0; font-size: 13px; color: #C0392B; }
.actions { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
.btn-primary { padding: 10px; border: none; border-radius: 8px; background: #4A90D9; color: #fff; font-size: 15px; cursor: pointer; }
.btn-cancel { padding: 10px; border: 1px solid #ddd; background: #fff; border-radius: 8px; cursor: pointer; font-size: 15px; }
.progress-area { margin-top: 14px; }
.bar { width: 100%; height: 10px; background: #eee; border-radius: 5px; overflow: hidden; }
.fill { height: 100%; background: #4A90D9; transition: width 0.2s; }
.progress-text { font-size: 12px; color: #666; margin: 8px 0 0; text-align: right; }
</style>
