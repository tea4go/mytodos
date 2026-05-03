<script setup lang="ts">
import { watch } from 'vue'
import { useWorkspaceStore } from './stores/workspace'
import { useReleaseStore } from './stores/release'
import UpgradeDialog from './components/upgrade/UpgradeDialog.vue'

const wsStore = useWorkspaceStore()
const releaseStore = useReleaseStore()

// 全局配置 release 字段变更（首次拉取或重新拉取）→ 重新判定升级
watch(
  () => wsStore.global?.release,
  (rel) => { releaseStore.evaluate(rel) },
  { immediate: true, deep: true },
)
</script>

<template>
  <router-view />
  <UpgradeDialog />
</template>
