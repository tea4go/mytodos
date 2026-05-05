import { fetchGist, parseTasksFromGist, updateGist, serializeTasks } from './api'
import { fetchGlobalConfig, saveGlobalConfig } from './global'
import { useWorkspaceStore } from '../stores/workspace'
import { useTaskStore } from '../stores/task'
import { useUiStore } from '../stores/ui'
import type { Task, WorkspaceMeta } from '../types'
import * as logHelper from './log_helper'

const TAG = 'sync'

/** 从全局 gist 拉取所有工作区配置，写入 store。 */
export async function loadGlobal(): Promise<void> {
  const wsStore = useWorkspaceStore()
  const ui = useUiStore()
  ui.setLoading(true)
  try {
    const cfg = await fetchGlobalConfig()
    wsStore.setGlobal(cfg)
    await logHelper.info(TAG, 'loadGlobal 成功')
  } catch (e: any) {
    const msg = `加载全局配置失败: ${e}`
    await logHelper.handleApiError(TAG, 'loadGlobal', e, (m) => ui.setError(m))
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
    await logHelper.info(TAG, `loadWorkspace 成功: gistId=${todosGistId}, tasks=${tasks.length}`)
  } catch (e: any) {
    await logHelper.handleApiError(TAG, `loadWorkspace(gistId=${todosGistId})`, e, (m) => ui.setError(m))
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
    await logHelper.info(TAG, `saveTaskUpdate 成功: taskId=${taskId}, updates=${JSON.stringify(updates)}`)
  } catch (e: any) {
    await logHelper.handleApiError(TAG, `saveTaskUpdate(taskId=${taskId})`, e, (m) => ui.setError(m))
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
    await logHelper.info(TAG, `appendTask 成功: taskId=${task.taskId}, title=${task.title}`)
  } catch (e: any) {
    await logHelper.handleApiError(TAG, `appendTask(title=${task.title})`, e, (m) => ui.setError(m))
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
    wsStore.setMeta(meta)
    if (wsStore.global) {
      await saveGlobalConfig(wsStore.global)
    }
    await logHelper.info(TAG, 'saveMeta 成功')
  } catch (e: any) {
    await logHelper.handleApiError(TAG, 'saveMeta', e, (m) => ui.setError(m))
    throw e
  } finally {
    ui.setLoading(false)
  }
}
