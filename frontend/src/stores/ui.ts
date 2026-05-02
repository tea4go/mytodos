import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

  function setLoading(v: boolean) { loading.value = v }
  function setError(msg: string | null) { error.value = msg }
  function clearError() { error.value = null }
  function setOnline(v: boolean) { isOnline.value = v }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => setOnline(true))
    window.addEventListener('offline', () => setOnline(false))
  }

  return { loading, error, isOnline, setLoading, setError, clearError, setOnline }
})
