// ===== 枚举 =====
export type Role = 'admin' | 'parent' | 'student'
export type TaskStatus = 'todo' | 'doing' | 'done'
export type Priority = 'low' | 'medium' | 'high'
export type DueDateFilter = 'today' | 'week' | 'overdue' | null

// ===== 成员 =====
export interface Member {
  memberId: string
  displayName: string
  role: Role
  password: string
  workspaceId: string | null
}

// ===== 标签 =====
export interface Tag {
  tagId: string
  name: string
  color: string
  createdAt: string
}

// ===== 任务 =====
export interface Task {
  taskId: string
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  dueAt: string
  assigneeId: string
  tagIds: string[]
  startedAt: string | null
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
  completedAt: string | null
  completedBy: string | null
  deletedAt: string | null
  deletedBy: string | null
}

// ===== 工作区配置（全局 gist 中的单个工作区项；不含成员/标签） =====
export interface WorkspaceConfig {
  workspaceId: string
  name: string
  description: string
  todosGistId: string
  createdAt: string
  updatedAt: string
}

// ===== 全局配置（GLOBAL_GIST 中的 global.json） =====
// 成员与标签为全局共享，与具体工作区无关联。
export interface GlobalConfig {
  schemaVersion: number
  workspaces: WorkspaceConfig[]
  members: Member[]
  tags: Tag[]
  release?: ReleaseInfo
}

// ===== 应用升级元数据（global.json 中的 release 字段） =====
export interface ReleaseInfo {
  latestVersion: string
  minSupportedVersion: string
  releasedAt: string
  releaseNotes?: string
  downloadUrls: {
    windows?: string
    macos?: string
    linux?: string
    android?: string
    ios?: string | null
  }
}

export type Platform = 'windows' | 'macos' | 'linux' | 'android' | 'ios'
export type UpgradeLevel = 'none' | 'recommend' | 'force'

export interface UpgradeDecision {
  level: UpgradeLevel
  current: string
  latest?: string
  minSupported?: string
  url?: string
  fileName?: string
  notes?: string
  platform: Platform
}

// ===== 工作区元数据（兼容旧 schema，已弃用，保留类型避免编译错误） =====
export interface WorkspaceMeta {
  schemaVersion: number
  workspace: {
    workspaceId: string
    name: string
    description: string
    createdAt: string
    updatedAt: string
  }
  members: Member[]
  tags: Tag[]
  revision: {
    remoteRevision: string
  }
}

// ===== Gist API =====
export interface GistFile {
  filename: string
  content?: string
  raw_url?: string
}

export interface GistResponse {
  id: string
  description?: string
  files: Record<string, GistFile>
  updated_at?: string
}

// ===== 筛选 / 排序 =====
export interface TaskFilter {
  status: TaskStatus | null
  assigneeId: string | null
  dueDate: DueDateFilter
  tagIds: string[]
  viewMode: 'active' | 'done'
}

export type SortRule = 'default'
