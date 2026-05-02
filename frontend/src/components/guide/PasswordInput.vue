<template>
  <div class="password-input">
    <h2>输入口令</h2>
    <div class="pin-display">
      <div
        v-for="i in 6"
        :key="i"
        :class="['pin-dot', { filled: password.length >= i }]"
      />
    </div>
    <p v-if="error" class="error-msg">{{ error }}</p>
    <div class="numpad">
      <button v-for="n in 9" :key="n" @click="append(n)" class="num-key">{{ n }}</button>
      <button class="num-key empty" disabled />
      <button @click="append(0)" class="num-key">0</button>
      <button @click="remove" class="num-key backspace">⌫</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ error?: string | null }>()
const emit = defineEmits<{ complete: [password: string] }>()

const password = ref('')

function append(n: number) {
  if (password.value.length < 6) {
    password.value += n.toString()
    if (password.value.length === 6) {
      emit('complete', password.value)
    }
  }
}
function remove() { password.value = password.value.slice(0, -1) }
</script>

<style scoped>
.password-input { text-align: center; }
.pin-display { display: flex; gap: 12px; justify-content: center; margin: 24px 0; }
.pin-dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #ccc; background: #fff; }
.pin-dot.filled { background: #4A90D9; border-color: #4A90D9; }
.error-msg { color: #E74C3C; font-size: 14px; }
.numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-width: 240px; margin: 0 auto; }
.num-key { padding: 16px; font-size: 20px; border: 1px solid #eee; border-radius: 8px; background: #fff; cursor: pointer; }
.num-key.empty { visibility: hidden; }
.backspace { color: #999; }
</style>
