import { invoke } from '@tauri-apps/api/core'
import type { WorkspaceMeta, GistResponse } from '../types'

// ===== Gist 操作（通过 Tauri 命令访问 Gitee API） =====
export async function fetchGist(gistId: string): Promise<GistResponse> {
  return await invoke<GistResponse>('gist_get', { gistId })
}

export async function createGist(
  description: string,
  files: Record<string, string>,
): Promise<GistResponse> {
  return await invoke<GistResponse>('gist_create', { description, files })
}

export async function updateGist(
  gistId: string,
  files: Record<string, string>,
): Promise<GistResponse> {
  return await invoke<GistResponse>('gist_update', { gistId, files })
}

// ===== 安全存储 =====
export async function secureStore(key: string, value: string): Promise<void> {
  await invoke('secure_store', { key, value })
}

export async function secureGet(key: string): Promise<string | null> {
  return await invoke<string | null>('secure_get', { key })
}

export async function secureRemove(key: string): Promise<void> {
  await invoke('secure_remove', { key })
}

// ===== Gist 内容序列化 / 解析 =====
export function parseMetaFromGist(gist: GistResponse): WorkspaceMeta {
  const file = gist.files?.['meta.json']
  if (!file?.content) throw new Error('meta.json not found in gist')
  return JSON.parse(file.content) as WorkspaceMeta
}

export function parseTasksFromGist(gist: GistResponse): any[] {
  const file = gist.files?.['todos.json']
  if (!file?.content) return []
  const data = JSON.parse(file.content)
  return data.tasks ?? []
}

export function serializeMeta(meta: WorkspaceMeta): string {
  return JSON.stringify(meta, null, 2)
}

export function serializeTasks(tasks: any[]): string {
  return JSON.stringify({ tasks }, null, 2)
}
