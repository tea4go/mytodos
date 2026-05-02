<template>
  <div :class="['top-bar', isOnline ? 'online' : 'offline']">
    <button v-if="showBack" @click="onBack" class="back-btn">←</button>
    <span class="title">{{ title }}</span>
    <button
      v-if="showSearch"
      @click="$emit('toggle-search')"
      :class="['icon-btn', { active: searchActive }]"
      title="搜索"
      aria-label="搜索"
      v-html="searchIcon"
    ></button>
    <button v-if="showLogout" @click="$emit('logout')" class="icon-btn" title="退出登录" aria-label="退出登录" v-html="logoutIcon"></button>
  </div>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router'
import logoutIcon from '../../assets/icons/logout.svg?raw'
import searchIcon from '../../assets/icons/search.svg?raw'
const props = defineProps<{
  title: string
  showBack?: boolean
  isOnline: boolean
  backTo?: string
  showLogout?: boolean
  showSearch?: boolean
  searchActive?: boolean
}>()
const emit = defineEmits<{ back: []; logout: []; 'toggle-search': [] }>()
const router = useRouter()
function onBack() {
  emit('back')
  if (props.backTo) {
    router.replace(props.backTo)
  } else if (window.history.length > 1) {
    router.back()
  } else {
    router.replace('/workspaces')
  }
}
</script>
<style scoped>
.top-bar { display: flex; align-items: center; padding: 12px 16px; color: #fff; }
.top-bar.online { background: #27AE60; }
.top-bar.offline { background: #E74C3C; }
.back-btn { font-size: 20px; background: none; border: none; cursor: pointer; padding: 0 8px 0 0; color: #fff; }
.title { flex: 1; font-size: 18px; font-weight: 600; }
.icon-btn {
  margin-left: 12px; width: 32px; height: 32px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.6); background: transparent; color: #fff;
  cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
  padding: 0;
}
.icon-btn :deep(svg) { width: 18px; height: 18px; display: block; }
.icon-btn :deep(svg path) { fill: #fff; }
.icon-btn:hover { background: rgba(255,255,255,0.15); }
.icon-btn.active { background: rgba(255,255,255,0.25); }
</style>
