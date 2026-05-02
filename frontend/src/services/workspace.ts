import { createGist, serializeMeta, serializeTasks } from './api'
import { useWorkspaceStore } from '../stores/workspace'
import type { Member, Tag, WorkspaceMeta } from '../types'

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
  { tagId: 'tag_pe', name: '体育', color: '#E67E22' },
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

/** 创建工作区：远端建 gist + 本地登记。返回管理员成员信息供调用方完成登录。 */
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
  const meta: WorkspaceMeta = {
    schemaVersion: 1,
    workspace: {
      workspaceId,
      name: input.name,
      description: input.description,
      createdAt: now,
      updatedAt: now,
    },
    members: [adminMember],
    tags: DEFAULT_TAGS.map(t => ({ ...t, createdAt: now })),
    revision: { remoteRevision: '1' },
  }
  const gist = await createGist(`MyTodos: ${input.name}`, {
    'meta.json': serializeMeta(meta),
    'todos.json': serializeTasks([]),
  })
  wsStore.addWorkspace({ workspaceId, gistId: gist.id, name: input.name })
  return { workspaceId, gistId: gist.id, adminMember, meta }
}
