import { fetchGist, updateGist } from './api'
import type { GlobalConfig, GistResponse } from '../types'

/** 编译期注入的全局配置 gistId，缺失时抛错。 */
export const GLOBAL_GIST_ID = (import.meta.env.VITE_GLOBAL_GIST_ID ?? '').trim()

export function ensureGlobalGistId(): string {
  if (!GLOBAL_GIST_ID) {
    throw new Error('未配置 VITE_GLOBAL_GIST_ID，请在 frontend/.env 中设置')
  }
  return GLOBAL_GIST_ID
}

/** 拉取全局配置 gist 并解析 global.json。 */
export async function fetchGlobalConfig(): Promise<GlobalConfig> {
  const gistId = ensureGlobalGistId()
  const gist = await fetchGist(gistId)
  return parseGlobalFromGist(gist)
}

export function parseGlobalFromGist(gist: GistResponse): GlobalConfig {
  const file = gist.files?.['global.json']
  if (!file?.content) {
    // 全局 gist 还未初始化（首次部署）：返回空配置
    return { schemaVersion: 2, workspaces: [] }
  }
  const parsed = JSON.parse(file.content)
  return {
    schemaVersion: parsed.schemaVersion ?? 2,
    workspaces: Array.isArray(parsed.workspaces) ? parsed.workspaces : [],
  }
}

export function serializeGlobal(cfg: GlobalConfig): string {
  return JSON.stringify(cfg, null, 2)
}

/** 写回全局配置 gist。 */
export async function saveGlobalConfig(cfg: GlobalConfig): Promise<void> {
  const gistId = ensureGlobalGistId()
  await updateGist(gistId, { 'global.json': serializeGlobal(cfg) })
}
