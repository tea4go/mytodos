import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ReleaseInfo, UpgradeDecision } from '../types'
import { APP_VERSION_CONST, decideUpgrade } from '../services/release'

export const useReleaseStore = defineStore('release', () => {
  const decision = ref<UpgradeDecision>({ level: 'none', current: APP_VERSION_CONST, platform: 'windows' })
  // 用户点过"稍后再说"，本会话内不再弹推荐升级
  const dismissed = ref(false)
  // 升级对话框是否打开
  const dialogOpen = ref(false)

  function evaluate(release: ReleaseInfo | undefined) {
    decision.value = decideUpgrade(release)
    if (decision.value.level === 'force') {
      dismissed.value = false
      dialogOpen.value = true
    } else if (decision.value.level === 'recommend' && !dismissed.value) {
      dialogOpen.value = true
    } else {
      dialogOpen.value = false
    }
  }

  function dismiss() {
    if (decision.value.level === 'force') return
    dismissed.value = true
    dialogOpen.value = false
  }

  function openDialog() { dialogOpen.value = true }
  function closeDialog() {
    if (decision.value.level === 'force') return
    dialogOpen.value = false
  }

  return { decision, dismissed, dialogOpen, evaluate, dismiss, openDialog, closeDialog }
})
