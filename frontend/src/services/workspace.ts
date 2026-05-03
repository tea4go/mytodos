import { createGist, serializeTasks } from './api'
import { fetchGlobalConfig, saveGlobalConfig } from './global'
import { useWorkspaceStore } from '../stores/workspace'
import type { Member, Tag, WorkspaceConfig } from '../types'

const DEFAULT_TAGS: Omit<Tag, 'createdAt'>[] = [
  { tagId: 'tag_chinese', name: '语文', color: '#E74C3C' },
  { tagId: 'tag_math', name: '数学', color: '#4A90D9' },
  { tagId: 'tag_english', name: '英语', color: '#27AE60' },
  { tagId: 'tag_physics', name: '物理', color: '#9B59B6' },
  { tagId: 'tag_chemistry', name: '化学', color: '#F5A623' },
  { tagId: 'tag_biology', name: '生物', color: '#16A085' },
  { tagId: 'tag_history', name: '历史', color: '#8B4513' },
  { tagId: 'tag_geography', name: '地理', color: '#2C8C99' },
  { tagId: 'tag_politics', name: '道法', color: '#C0392B' },
  { tagId: 'tag_other', name: '其他', color: '#7F8C8D' },
]

export interface CreateWorkspaceInput {
  name: string
  description: string
}

export interface CreateWorkspaceResult {
  workspaceId: string
  gistId: string
  workspaceConfig: WorkspaceConfig
}

/**
 * 创建工作区（不含成员）：
 * 1) 新建一个 todos gist（仅 todos.json）
 * 2) 拉取全局配置 gist：
 *    - workspaces 追加新工作区基本信息
 *    - global.tags 为空时一次性写入默认标签
 * 3) 写回全局配置 gist
 */
export async function createWorkspace(input: CreateWorkspaceInput): Promise<CreateWorkspaceResult> {
  const wsStore = useWorkspaceStore()
  const now = new Date().toISOString()
  const workspaceId = `ws_${Date.now()}`
  // 1) 新建 todos gist
  const todosGist = await createGist(`MyTodos: ${input.name}`, {
    'todos.json': serializeTasks([]),
  })
  // 2) 拉取全局配置
  const globalCfg = await fetchGlobalConfig()
  const cfg: WorkspaceConfig = {
    workspaceId,
    name: input.name,
    description: input.description,
    todosGistId: todosGist.id,
    createdAt: now,
    updatedAt: now,
  }
  globalCfg.workspaces.push(cfg)
  // 全局标签：仅在为空时一次性写入默认集合
  if (globalCfg.tags.length === 0) {
    for (const t of DEFAULT_TAGS) {
      globalCfg.tags.push({ ...t, createdAt: now })
    }
  }
  // 3) 写回全局
  await saveGlobalConfig(globalCfg)
  // 同步 store
  wsStore.setGlobal(globalCfg)

  return { workspaceId, gistId: todosGist.id, workspaceConfig: cfg }
}

/**
 * 创建初始管理员成员（首启向导第二步调用）。
 * 将 admin 追加到全局 members 数组并写回。
 */
export async function createInitialAdmin(input: {
  displayName: string
  password: string
  workspaceId: string | null
}): Promise<Member> {
  const wsStore = useWorkspaceStore()
  const adminMember: Member = {
    memberId: `m_${Date.now()}`,
    displayName: input.displayName,
    role: 'admin',
    password: input.password,
    workspaceId: input.workspaceId,
  }
  const globalCfg = await fetchGlobalConfig()
  if (!globalCfg.members.some(m => m.memberId === adminMember.memberId)) {
    globalCfg.members.push(adminMember)
  }
  await saveGlobalConfig(globalCfg)
  wsStore.setGlobal(globalCfg)
  return adminMember
}

/**
 * 已有 admin 上下文下新增一个工作区：仅创建 todos gist + 追加 workspaces 条目，
 * 不再生成新 admin、不再覆盖默认标签。
 */
export async function createAdditionalWorkspace(input: { name: string; description: string }): Promise<WorkspaceConfig> {
  const wsStore = useWorkspaceStore()
  const now = new Date().toISOString()
  const workspaceId = `ws_${Date.now()}`
  const todosGist = await createGist(`MyTodos: ${input.name}`, {
    'todos.json': serializeTasks([]),
  })
  const globalCfg = await fetchGlobalConfig()
  const cfg: WorkspaceConfig = {
    workspaceId,
    name: input.name.trim(),
    description: input.description.trim(),
    todosGistId: todosGist.id,
    createdAt: now,
    updatedAt: now,
  }
  globalCfg.workspaces.push(cfg)
  await saveGlobalConfig(globalCfg)
  wsStore.setGlobal(globalCfg)
  return cfg
}

/** 更新工作区基本信息（名称/描述）。 */
export async function updateWorkspaceConfig(workspaceId: string, patch: { name?: string; description?: string }): Promise<void> {
  const wsStore = useWorkspaceStore()
  const globalCfg = await fetchGlobalConfig()
  const idx = globalCfg.workspaces.findIndex(w => w.workspaceId === workspaceId)
  if (idx < 0) throw new Error('工作区不存在')
  const now = new Date().toISOString()
  const w = globalCfg.workspaces[idx]
  globalCfg.workspaces[idx] = {
    ...w,
    name: patch.name?.trim() ?? w.name,
    description: patch.description?.trim() ?? w.description,
    updatedAt: now,
  }
  await saveGlobalConfig(globalCfg)
  wsStore.setGlobal(globalCfg)
}

/** 从全局配置中移除工作区（todos gist 不删除，留给开发者手工清理）。挂在被删工作区的成员自动转为全局。 */
export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const wsStore = useWorkspaceStore()
  const globalCfg = await fetchGlobalConfig()
  globalCfg.workspaces = globalCfg.workspaces.filter(w => w.workspaceId !== workspaceId)
  // 挂在被删工作区的成员自动转为全局
  for (const m of globalCfg.members) {
    if (m.workspaceId === workspaceId) {
      m.workspaceId = null
    }
  }
  await saveGlobalConfig(globalCfg)
  wsStore.setGlobal(globalCfg)
  if (wsStore.currentWorkspaceId === workspaceId) {
    wsStore.clearCurrentWorkspace()
  }
}
