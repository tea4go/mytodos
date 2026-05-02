import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Member, Role } from '../types'
import { secureStore, secureGet, secureRemove } from '../services/api'
import { useWorkspaceStore } from './workspace'

const KEY_MEMBER_ID = 'current_member_id'
const KEY_MEMBER_ROLE = 'current_member_role'
const KEY_MEMBER_PASSWORD = 'current_member_password'

export const useAuthStore = defineStore('auth', () => {
  const currentMemberId = ref<string | null>(null)
  const role = ref<Role | null>(null)
  const password = ref<string | null>(null)
  const isFirstLaunch = ref(true)

  const isLoggedIn = computed(() => currentMemberId.value !== null)

  /** 登录：以指定工作区中的成员身份登录，并持久化到安全存储。 */
  async function login(args: { workspaceId: string; gistId: string; member: Member; password: string }) {
    currentMemberId.value = args.member.memberId
    role.value = args.member.role
    password.value = args.password
    isFirstLaunch.value = false

    const wsStore = useWorkspaceStore()
    wsStore.setCurrentWorkspace(args.workspaceId, args.gistId)

    try {
      await secureStore(KEY_MEMBER_ID, args.member.memberId)
      await secureStore(KEY_MEMBER_ROLE, args.member.role)
      await secureStore(KEY_MEMBER_PASSWORD, args.password)
    } catch {
      localStorage.setItem(KEY_MEMBER_ID, args.member.memberId)
      localStorage.setItem(KEY_MEMBER_ROLE, args.member.role)
    }
  }

  /** 启动时恢复会话；同时恢复当前工作区。 */
  async function restoreSession(): Promise<boolean> {
    const wsStore = useWorkspaceStore()
    wsStore.restoreWorkspace()

    let memberId: string | null = null
    let savedRole: string | null = null
    let savedPw: string | null = null
    try {
      memberId = await secureGet(KEY_MEMBER_ID)
      savedRole = await secureGet(KEY_MEMBER_ROLE)
      savedPw = await secureGet(KEY_MEMBER_PASSWORD)
    } catch {
      memberId = localStorage.getItem(KEY_MEMBER_ID)
      savedRole = localStorage.getItem(KEY_MEMBER_ROLE)
    }

    if (!memberId) return false
    currentMemberId.value = memberId
    role.value = (savedRole as Role | null) ?? null
    password.value = savedPw ?? null
    isFirstLaunch.value = false
    return true
  }

  async function logout() {
    currentMemberId.value = null
    role.value = null
    password.value = null
    isFirstLaunch.value = true
    try {
      await secureRemove(KEY_MEMBER_ID)
      await secureRemove(KEY_MEMBER_ROLE)
      await secureRemove(KEY_MEMBER_PASSWORD)
    } catch { /* ignore */ }
    localStorage.removeItem(KEY_MEMBER_ID)
    localStorage.removeItem(KEY_MEMBER_ROLE)
  }

  return {
    currentMemberId, role, password, isFirstLaunch,
    isLoggedIn, login, restoreSession, logout,
  }
})
