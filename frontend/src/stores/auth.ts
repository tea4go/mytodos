import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Role } from '../types'
import { secureStore, secureGet } from '../services/api'

export const useAuthStore = defineStore('auth', () => {
  const role = ref<Role | null>(null)
  const password = ref<string | null>(null)
  const isFirstLaunch = ref(true)
  const currentMemberId = ref<string | null>(null)

  const isLoggedIn = computed(() => role.value !== null)

  async function login(r: Role, pw: string) {
    role.value = r
    password.value = pw
    isFirstLaunch.value = false
    try {
      await secureStore('user_role', r)
      await secureStore('user_password', pw)
    } catch {
      localStorage.setItem('user_role', r)
    }
  }

  async function restoreSession(): Promise<boolean> {
    try {
      const savedRole = await secureGet('user_role')
      const savedPw = await secureGet('user_password')
      if (savedRole) {
        role.value = savedRole as Role
        password.value = savedPw ?? null
        isFirstLaunch.value = false
        return true
      }
    } catch {
      const saved = localStorage.getItem('user_role')
      if (saved) {
        role.value = saved as Role
        isFirstLaunch.value = false
        return true
      }
    }
    return false
  }

  function logout() {
    role.value = null
    password.value = null
    isFirstLaunch.value = true
    currentMemberId.value = null
    localStorage.removeItem('user_role')
  }

  return { role, password, isFirstLaunch, currentMemberId, isLoggedIn, login, restoreSession, logout }
})
