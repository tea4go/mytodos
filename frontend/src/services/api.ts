import { invoke } from '@tauri-apps/api/core'
import type { WorkspaceMeta, GistResponse } from '../types'
import * as logHelper from './log_helper'

const TAG = 'api'

// ===== Gist 操作（通过 Tauri 命令访问 Gitee API） =====
export async function fetchGist(gistId: string): Promise<GistResponse> {
  try {
    return await invoke<GistResponse>('gist_get', { gistId })
  } catch (err) {
    await logHelper.handleApiError(TAG, `fetchGist(gistId=${gistId})`, err)
    throw err // unreachable but for type safety
  }
}

export async function createGist(
  description: string,
  files: Record<string, string>,
): Promise<GistResponse> {
  try {
    return await invoke<GistResponse>('gist_create', { description, files })
  } catch (err) {
    await logHelper.handleApiError(TAG, 'createGist', err)
    throw err
  }
}

export async function updateGist(
  gistId: string,
  files: Record<string, string>,
): Promise<GistResponse> {
  try {
    return await invoke<GistResponse>('gist_update', { gistId, files })
  } catch (err) {
    await logHelper.handleApiError(TAG, `updateGist(gistId=${gistId})`, err)
    throw err
  }
}

// ===== 安全存储 =====
export async function secureStore(key: string, value: string): Promise<void> {
  try {
    await invoke('secure_store', { key, value })
  } catch (err) {
    await logHelper.handleApiError(TAG, `secureStore(key=${key})`, err)
    throw err
  }
}

export async function secureGet(key: string): Promise<string | null> {
  try {
    return await invoke<string | null>('secure_get', { key })
  } catch (err) {
    await logHelper.handleApiError(TAG, `secureGet(key=${key})`, err)
    throw err
  }
}

export async function secureRemove(key: string): Promise<void> {
  try {
    await invoke('secure_remove', { key })
  } catch (err) {
    await logHelper.handleApiError(TAG, `secureRemove(key=${key})`, err)
    throw err
  }
}

// ===== Gist 内容序列化 / 解析 =====
export function parseMetaFromGist(gist: GistResponse): WorkspaceMeta {
  const file = gist.files?.['meta.json']
  if (!file?.content) {
    const err = new Error('meta.json not found in gist')
    logHelper.error(TAG, 'parseMetaFromGist: meta.json not found')
    throw err
  }
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
