import { createGist, serializeTasks } from './api'
import { fetchGlobalConfig, saveGlobalConfig } from './global'
import { useWorkspaceStore } from '../stores/workspace'
import type { Member, Tag, WorkspaceConfig, WorkspaceMeta } from '../types'

const DEFAULT_TAGS: Omit<Tag, 'createdAt'>[] = [
  { tagId: 'tag_chinese', name: '语文', color: '#E74C3C' },
  { tagId: 'tag_math', name: '数学', color: '#4A90D9' },
  { tagId: 'tag_english', name: '英语', color: '#27AE60' },
  { tagId: 'tag_physics', name: '物理', color: '#9B59B6' },
  { tagId: 'tag_chemistry', name: '化学', color: '#F5A623' },
  { tagId: 'tag_biology', name: '生物', color: '#16A085' },
  { tagId: 'tag_history', name: '历史', color: '#8B4513' },
  { tagId: 'tag_geography', name: '地理', color: '#2C8C99' },
  { tagId: 'tag_politics', name: '政治', color: '#C0392B' },
  { tagId: 'tag_other', name: '其他', color: '#7F8C8D' },
]

export interface CreateWorkspaceInput {
  name: string
  description: string
  adminName: string
  adminPassword: string
}

export interface CreateWorkspaceResult {
  workspaceId: string
  gistId: string
  adminMember: Member
  meta: WorkspaceMeta
}

/**
 * 创建工作区：
 * 1) 新建一个 todos gist（仅 todos.json）
 * 2) 拉取全局配置 gist，向 workspaces 数组追加新工作区
 * 3) 写回全局配置 gist
 */
export async function createWorkspace(input: CreateWorkspaceInput): Promise<CreateWorkspaceResult> {
  const wsStore = useWorkspaceStore()
  const now = new Date().toISOString()
  const workspaceId = `ws_${Date.now()}`
  const adminMember: Member = {
    memberId: `m_${Date.now()}`,
    displayName: input.adminName,
    role: 'admin',
    password: input.adminPassword,
  }
  // 1) 新建 todos gist
  const todosGist = await createGist(`MyTodos: ${input.name}`, {
    'todos.json': serializeTasks([]),
  })
  // 2) 拉取全局配置（首次部署时可能为空 schema）
  const globalCfg = await fetchGlobalConfig()
  const cfg: WorkspaceConfig = {
    workspaceId,
    name: input.name,
    description: input.description,
    todosGistId: todosGist.id,
    createdAt: now,
    updatedAt: now,
    members: [adminMember],
    tags: DEFAULT_TAGS.map(t => ({ ...t, createdAt: now })),
  }
  globalCfg.workspaces.push(cfg)
  // 3) 写回全局
  await saveGlobalConfig(globalCfg)
  // 同步 store
  wsStore.setGlobal(globalCfg)

  const meta: WorkspaceMeta = {
    schemaVersion: 2,
    workspace: { workspaceId, name: cfg.name, description: cfg.description, createdAt: now, updatedAt: now },
    members: cfg.members,
    tags: cfg.tags,
    revision: { remoteRevision: '' },
  }
  return { workspaceId, gistId: todosGist.id, adminMember, meta }
}
