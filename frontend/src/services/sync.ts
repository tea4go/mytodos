import { fetchGist, parseTasksFromGist, updateGist, serializeTasks } from './api'
import { fetchGlobalConfig, saveGlobalConfig } from './global'
import { useWorkspaceStore } from '../stores/workspace'
import { useTaskStore } from '../stores/task'
import { useUiStore } from '../stores/ui'
import type { Task, WorkspaceMeta } from '../types'

/** 从全局 gist 拉取所有工作区配置，写入 store。 */
export async function loadGlobal(): Promise<void> {
  const wsStore = useWorkspaceStore()
  const ui = useUiStore()
  ui.setLoading(true)
  try {
    const cfg = await fetchGlobalConfig()
    wsStore.setGlobal(cfg)
  } catch (e: any) {
    ui.setError(`加载全局配置失败: ${e}`)
    throw e
  } finally {
    ui.setLoading(false)
  }
}

/** 加载某工作区的任务（参数为该工作区的 todosGistId）。 */
export async function loadWorkspace(todosGistId: string): Promise<void> {
  const taskStore = useTaskStore()
  const ui = useUiStore()
  if (!todosGistId) return
  ui.setLoading(true)
  try {
    const gist = await fetchGist(todosGistId)
    const tasks = parseTasksFromGist(gist)
    taskStore.setTasks(tasks as Task[])
  } catch (e: any) {
    ui.setError(`加载任务失败: ${e}`)
    throw e
  } finally {
    ui.setLoading(false)
  }
}

export async function saveTaskUpdate(
  todosGistId: string,
  taskId: string,
  updates: Partial<Task>,
): Promise<void> {
  const taskStore = useTaskStore()
  const ui = useUiStore()
  ui.setLoading(true)
  try {
    const gist = await fetchGist(todosGistId)
    const allTasks = parseTasksFromGist(gist)
    const idx = allTasks.findIndex((t: any) => t.taskId === taskId)
    if (idx !== -1) allTasks[idx] = { ...allTasks[idx], ...updates }
    await updateGist(todosGistId, { 'todos.json': serializeTasks(allTasks) })
    taskStore.updateTask(taskId, updates)
  } catch (e: any) {
    ui.setError(`保存失败: ${e}`)
    throw e
  } finally {
    ui.setLoading(false)
  }
}

export async function appendTask(todosGistId: string, task: Task): Promise<void> {
  const taskStore = useTaskStore()
  const ui = useUiStore()
  ui.setLoading(true)
  try {
    const gist = await fetchGist(todosGistId)
    const allTasks = parseTasksFromGist(gist)
    allTasks.push(task)
    await updateGist(todosGistId, { 'todos.json': serializeTasks(allTasks) })
    taskStore.addTask(task)
  } catch (e: any) {
    ui.setError(`创建任务失败: ${e}`)
    throw e
  } finally {
    ui.setLoading(false)
  }
}

/**
 * 兼容旧调用：把 WorkspaceMeta 形态的成员/标签/工作区基本信息写回全局配置 gist。
 * 第一参数 _todosGistId 已废弃，仅为保持调用方签名兼容。
 */
export async function saveMeta(_todosGistId: string, meta: WorkspaceMeta): Promise<void> {
  const wsStore = useWorkspaceStore()
  const ui = useUiStore()
  ui.setLoading(true)
  try {
    // 1) 更新内存中的全局配置
    wsStore.setMeta(meta)
    // 2) 写回全局 gist
    if (wsStore.global) {
      await saveGlobalConfig(wsStore.global)
    }
  } catch (e: any) {
    ui.setError(`保存元数据失败: ${e}`)
    throw e
  } finally {
    ui.setLoading(false)
  }
}
