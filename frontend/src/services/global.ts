import { fetchGist, updateGist } from './api'
import type { GlobalConfig, GistResponse, ReleaseInfo } from '../types'

/** 编译期注入的全局配置 gistId，缺失时抛错。 */
export const GLOBAL_GIST_ID = (import.meta.env.VITE_GLOBAL_GIST_ID ?? '').trim()

export function ensureGlobalGistId(): string {
  if (!GLOBAL_GIST_ID) {
    logHelper.error(TAG, '未配置 VITE_GLOBAL_GIST_ID')
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
    return { schemaVersion: 3, workspaces: [], members: [], tags: [] }
  }
  const parsed = JSON.parse(file.content)
  const workspacesRaw: any[] = Array.isArray(parsed.workspaces) ? parsed.workspaces : []
  // 兼容旧结构：workspaces[i] 内含 members/tags 时，合并到全局
  const aggregatedMembers: any[] = Array.isArray(parsed.members) ? [...parsed.members] : []
  const aggregatedTags: any[] = Array.isArray(parsed.tags) ? [...parsed.tags] : []
  const workspaces = workspacesRaw.map(w => {
    if (Array.isArray(w.members)) {
      for (const m of w.members) {
        if (!aggregatedMembers.some(x => x.memberId === m.memberId)) aggregatedMembers.push(m)
      }
    }
    if (Array.isArray(w.tags)) {
      for (const t of w.tags) {
        if (!aggregatedTags.some(x => x.tagId === t.tagId)) aggregatedTags.push(t)
      }
    }
    return {
      workspaceId: w.workspaceId,
      name: w.name,
      description: w.description ?? '',
      todosGistId: w.todosGistId,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }
  })
  const needMigrate = (parsed.schemaVersion ?? 2) < 3
  const members: GlobalConfig['members'] = aggregatedMembers.map(m => ({
    memberId: m.memberId,
    displayName: m.displayName,
    role: m.role,
    password: m.password,
    workspaceId: needMigrate ? null : (m.workspaceId ?? null),
  }))
  return {
    schemaVersion: 3,
    workspaces,
    members,
    tags: aggregatedTags,
    release: parseRelease(parsed.release),
  }
}

function parseRelease(raw: any): ReleaseInfo | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  if (typeof raw.latestVersion !== 'string' || typeof raw.minSupportedVersion !== 'string') return undefined
  const urls = (raw.downloadUrls && typeof raw.downloadUrls === 'object') ? raw.downloadUrls : {}
  return {
    latestVersion: raw.latestVersion,
    minSupportedVersion: raw.minSupportedVersion,
    releasedAt: typeof raw.releasedAt === 'string' ? raw.releasedAt : '',
    releaseNotes: typeof raw.releaseNotes === 'string' ? raw.releaseNotes : undefined,
    downloadUrls: {
      windows: urls.windows ?? undefined,
      macos: urls.macos ?? undefined,
      linux: urls.linux ?? undefined,
      android: urls.android ?? undefined,
      ios: urls.ios ?? null,
    },
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
