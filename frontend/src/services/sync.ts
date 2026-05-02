import { fetchGist, parseMetaFromGist, parseTasksFromGist, updateGist, serializeMeta, serializeTasks } from './api'
import { useWorkspaceStore } from '../stores/workspace'
import { useTaskStore } from '../stores/task'
import { useUiStore } from '../stores/ui'
import type { Task, WorkspaceMeta } from '../types'

export async function loadWorkspace(gistId: string): Promise<void> {
  const wsStore = useWorkspaceStore()
  const taskStore = useTaskStore()
  const ui = useUiStore()

  ui.setLoading(true)
  try {
    const gist = await fetchGist(gistId)
    const meta = parseMetaFromGist(gist)
    const tasks = parseTasksFromGist(gist)
    wsStore.setMeta(meta)
    taskStore.setTasks(tasks as Task[])
  } catch (e: any) {
    ui.setError(`加载工作区失败: ${e}`)
    throw e
  } finally {
    ui.setLoading(false)
  }
}

export async function saveTaskUpdate(
  gistId: string,
  taskId: string,
  updates: Partial<Task>,
): Promise<void> {
  const taskStore = useTaskStore()
  const ui = useUiStore()
  ui.setLoading(true)
  try {
    const gist = await fetchGist(gistId)
    const allTasks = parseTasksFromGist(gist)
    const idx = allTasks.findIndex((t: any) => t.taskId === taskId)
    if (idx !== -1) allTasks[idx] = { ...allTasks[idx], ...updates }
    await updateGist(gistId, { 'todos.json': serializeTasks(allTasks) })
    taskStore.updateTask(taskId, updates)
  } catch (e: any) {
    ui.setError(`保存失败: ${e}`)
    throw e
  } finally {
    ui.setLoading(false)
  }
}

export async function appendTask(gistId: string, task: Task): Promise<void> {
  const taskStore = useTaskStore()
  const ui = useUiStore()
  ui.setLoading(true)
  try {
    const gist = await fetchGist(gistId)
    const allTasks = parseTasksFromGist(gist)
    allTasks.push(task)
    await updateGist(gistId, { 'todos.json': serializeTasks(allTasks) })
    taskStore.addTask(task)
  } catch (e: any) {
    ui.setError(`创建任务失败: ${e}`)
    throw e
  } finally {
    ui.setLoading(false)
  }
}

export async function saveMeta(gistId: string, meta: WorkspaceMeta): Promise<void> {
  const wsStore = useWorkspaceStore()
  const ui = useUiStore()
  ui.setLoading(true)
  try {
    await updateGist(gistId, { 'meta.json': serializeMeta(meta) })
    wsStore.setMeta(meta)
  } catch (e: any) {
    ui.setError(`保存元数据失败: ${e}`)
    throw e
  } finally {
    ui.setLoading(false)
  }
}
