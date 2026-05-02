<template>
  <div class="workspace-card" @click="$emit('select', workspace.workspaceId)">
    <div class="ws-info">
      <h3>{{ workspace.name }}</h3>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ workspace: { workspaceId: string; gistId: string; name: string }; isAdmin: boolean }>()
defineEmits<{ select: [workspaceId: string] }>()
</script>

<style scoped>
.workspace-card { display: flex; align-items: center; padding: 16px; margin: 8px 0; border-radius: 12px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; }
.ws-info h3 { margin: 0; font-size: 18px; }
</style>
