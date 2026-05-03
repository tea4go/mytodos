# MyTodos 团队待办 App — 产品设计文档（PRD）

## 1. 文档概述

### 1.1 文档目的

本文档基于《1-SRS需求.md》，描述 MyTodos 的技术架构、模块设计、数据流、路由设计及关键算法，为开发实现提供详细设计依据。

### 1.2 对应 SRS 版本

基于 `1-SRS需求.md` 最终版本。

---

## 2. 系统架构

### 2.1 总体架构

```
┌─────────────────────────────────────────────────┐
│                   Vue 3 前端                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  路由层   │ │ 状态管理  │ │    组件层         │ │
│  │ (router)  │ │ (Pinia)  │ │ (views/components)│ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
├─────────────────────────────────────────────────┤
│                  Tauri 2 桥接层                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Gitee API│ │ 安全存储  │ │    文件系统       │ │
│  │ 客户端    │ │ (keyring)│ │   (导入/导出)     │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
├─────────────────────────────────────────────────┤
│                  Gitee API (v5)                   │
│            https://gitee.com/api/v5               │
└─────────────────────────────────────────────────┘
```

### 2.2 技术栈明细

| 层 | 技术 | 说明 |
|----|------|------|
| 前端框架 | Vue 3 + Composition API | 响应式 UI |
| 状态管理 | Pinia | 工作区、任务、用户状态 |
| 路由 | Vue Router 4 | 页面导航与角色守卫 |
| UI 组件 | 自研 / 轻量组件库 | 移动端优先 |
| 桌面壳 | Tauri 2 | Rust 后端 + WebView |
| HTTP | Tauri HTTP Plugin / fetch | Gitee API 调用 |
| 安全存储 | Tauri Plugin (keyring/secure-store) | PAT、成员密码、workspaceKey |
| 构建 | Vite | 前端打包 |

---

## 3. 路由设计

### 3.1 路由表

| 路径 | 页面 | 组件 | 角色 |
|------|------|------|------|
| `/guide` | UI-001 引导页 | GuideView | 无（仅本地无工作区时显示） |
| `/workspaces` | UI-002 工作区列表 | WorkspaceListView | 所有角色（含未登录） |
| `/login` | UI-002a 登录页（含工作区选择器） | WorkspaceLoginView | 无（允许未登录访问） |
| `/workspaces/:id/tasks` | UI-101 任务列表 | TaskListView | 家长、学生 |
| `/workspaces/:id/tasks/:taskId` | UI-102 任务详情 | TaskDetailView | 所有角色 |
| `/workspaces/:id/tags` | UI-103 标签管理 | TagManageView | 仅管理员 |
| `/workspaces/:id/members` | 成员管理 | MemberManageView | 仅管理员 |
| `/workspaces/:id/settings` | UI-104 工作区设置 | WorkspaceSettingsView | 仅管理员 |
| `/workspaces/:id/admin` | UI-200 管理员主页 | AdminHomeView | 仅管理员 |

### 3.2 路由守卫

```
Router.beforeEach(to, from, next):
  1. 尝试从安全存储恢复 session（currentMemberId + role + password + currentWorkspaceId）
  2. 未登录访问受限路由：
     - 允许：/guide、/workspaces、/login
     - 其他 → 跳 /login（若有工作区且至少有 admin）或 /guide（首启）
  3. 已登录访问 /guide → 跳到角色默认页
  4. 检查 to.meta.roles 是否包含当前 role；不匹配 → 跳角色默认页
```

### 3.3 角色默认页

| 角色 | 已选工作区 | 备注 |
|------|-----------|------|
| 未登录 | - | `/workspaces`（多工作区可选）；本地为空时回 `/guide` |
| admin | `/workspaces/:id/admin` | 管理员登录后默认进入管理员主页（UI-200），含成员/标签/工作区设置三个入口 |
| parent | `/workspaces/:id/tasks` | |
| student | `/workspaces/:id/tasks` | |

### 3.4 退出登录跳转

- 退出后统一跳转 `/login`（保留当前工作区上下文，便于切换成员）。
- 本地无任何工作区 → `/guide`。

---

## 4. 状态管理（Pinia Store）

### 4.1 Store 结构

```
stores/
├── auth.ts          // 当前成员、密码、登录态（角色由 member.role 派生）
├── workspace.ts     // 工作区列表、当前工作区、meta 数据
├── task.ts          // 任务列表、筛选条件、排序、搜索
├── tag.ts           // 标签列表
└── ui.ts            // 加载状态、错误提示、网络状态
```

### 4.2 auth Store

```typescript
interface AuthState {
  currentMemberId: string | null                 // 当前登录成员的 UUID
  password: string | null                        // 该成员的 6 位密码（仅内存/安全存储）
  role: 'admin' | 'parent' | 'student' | null   // 由 currentMember.role 派生
  isFirstLaunch: boolean                         // 是否首次启动
}
```

### 4.3 workspace Store

```typescript
interface WorkspaceState {
  global: GlobalConfig | null          // 全局配置 gist 内容（含所有工作区配置）
  currentWorkspaceId: string | null    // 当前工作区
  currentTodosGistId: string | null    // 当前工作区的任务 gistId
}

interface GlobalConfig {
  schemaVersion: 3                     // v3 起 Member 含 workspaceId 字段
  workspaces: WorkspaceConfig[]        // 工作区基本信息（不含成员/标签）
  members: Member[]                    // 全局成员列表（每条可挂在某工作区或全局）
  tags: Tag[]                          // 全局标签列表（所有工作区共享）
}

interface Member {
  memberId: string
  displayName: string
  role: 'admin' | 'parent' | 'student'
  password: string
  workspaceId: string | null           // 弱绑定：null = 全局成员；非空 = 仅挂在该工作区
}

interface WorkspaceConfig {
  workspaceId: string
  name: string
  description: string
  todosGistId: string
  createdAt: string
  updatedAt: string
}
```

### 4.4 task Store

```typescript
interface TaskState {
  tasks: Task[]                    // 任务列表（家长可见全部；学生在 filteredTasks 中按 assigneeId 过滤）
  filter: {
    status: TaskStatus | null      // 状态筛选（默认 'todo'）
    assigneeId: string | null      // 指派人筛选
    dueDate: 'today' | 'week' | 'overdue' | null  // 截止筛选（默认 'today'，学生进入时强制为 null）
    tagIds: string[]               // 标签筛选（多选）
    viewMode: 'active' | 'done'    // 学生视图模式（'active' = todo+doing；'done' = done）
  }
  sort: SortRule                    // 排序规则
  searchKeyword: string             // 搜索关键词（搜索框默认隐藏）
  loading: boolean                  // 加载状态
}
```

**学生角色可见性**：`filteredTasks` 计算属性在过滤前先按 `auth.role === 'student'` 时 `t.assigneeId === auth.currentMemberId` 收紧数据，使学生看不到他人任务。

---

## 5. 核心模块设计

### 5.1 Gitee API 客户端（Rust 侧）

```rust
// Tauri Command 定义
#[tauri::command]
async fn gist_get(gist_id: String) -> Result<GistResponse, String>

#[tauri::command]
async fn gist_update(gist_id: String, files: HashMap<String, GistFile>) -> Result<GistResponse, String>

#[tauri::command]
async fn gist_create(description: String, files: HashMap<String, GistFile>) -> Result<GistResponse, String>
```

**请求流程：**

1. 前端 `invoke('gist_get', { gist_id })`
2. Rust 侧构造 HTTPS 请求 (`Authorization: token {PAT}`)
3. 发送到 `api.gitee.com/v5/gists/{gist_id}`
4. 返回 JSON → 反序列化 → 返回前端

**错误处理：**

- 401/403 → 返回 `AuthError`，前端引导重新配置
- 404 → 返回 `NotFound`，前端提示迁移
- 429/5xx → 自动重试（指数退避：1s, 2s, 4s），最多 3 次

### 5.2 安全存储模块（Rust 侧）

```rust
#[tauri::command]
async fn secure_store(key: String, value: String) -> Result<(), String>

#[tauri::command]
async fn secure_get(key: String) -> Result<String, String>

#[tauri::command]
async fn secure_remove(key: String) -> Result<(), String>
```

**存储项：**

| Key | Value | 说明 |
|-----|-------|------|
| `current_member_id` | UUID | 当前登录成员 ID（角色由 meta.members 中该成员的 role 字段派生） |
| `current_member_password` | "123456" | 当前成员的 6 位密码 |
| `current_workspace_id` | UUID | 当前选中工作区 |
| `gitee_pat` | token 字符串 | 编译时注入，运行时可更新 |

---

## 6. 数据流

### 6.1 读写流程

```
┌──────────┐     invoke      ┌──────────┐    HTTPS     ┌──────────┐
│ Vue 前端  │ ──────────────→ │ Rust 后端 │ ──────────→ │ Gitee API│
│ (Pinia)   │ ←────────────── │ (Tauri)  │ ←────────── │          │
└──────────┘    JSON 结果     └──────────┘   JSON 响应  └──────────┘
```

**写操作流程（以创建任务为例）：**

1. 家长在 UI 填写表单 → 提交
2. Pinia taskStore 构造新 task 对象，生成 UUID
3. 调用 `invoke('gist_get', { gist_id })` 获取最新远端数据（含 revision）
4. 将新 task push 到 tasks 数组
5. 调用 `invoke('gist_update', { gist_id, files })` 写入远端（携带当前 revision）
6. 成功 → 更新本地 taskStore
7. 冲突（revision 不匹配）→ 重新拉取 → 合并 → 提示用户

### 6.2 并发冲突处理

```
写入前:
  1. 获取远端当前 revision: R1
  2. 本地修改数据
  3. PUT 请求携带 base_revision: R1

写入时:
  - 远端 revision == R1 → 写入成功，返回新 revision R2
  - 远端 revision != R1 → 冲突：
      1. GET 最新远端数据
      2. 本地变更与远端变更做字段级合并：
         - 不同字段 → 自动合并
         - 相同字段 → 标记冲突，交用户选择（保留我的/保留远端的）
      3. 用户解决后重新 PUT
```

---

## 7. 关键算法

### 7.1 任务排序

```typescript
function sortTasks(tasks: Task[]): Task[] {
  const now = new Date()
  return tasks.sort((a, b) => {
    // 1. 逾期优先（已逾期 > 未逾期）
    const aOverdue = a.dueAt && new Date(a.dueAt) < now ? 0 : 1
    const bOverdue = b.dueAt && new Date(b.dueAt) < now ? 0 : 1
    if (aOverdue !== bOverdue) return aOverdue - bOverdue

    // 2. 截止时间升序（更紧急的先显示）
    if (a.dueAt && b.dueAt) {
      const cmp = new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
      if (cmp !== 0) return cmp
    }

    // 3. 创建时间降序（更新建的先显示）
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}
```

### 7.2 任务搜索

```typescript
function searchTasks(tasks: Task[], keyword: string): Task[] {
  const kw = keyword.toLowerCase().trim()
  if (!kw) return tasks
  return tasks.filter(t =>
    t.title.toLowerCase().includes(kw) ||
    (t.description && t.description.toLowerCase().includes(kw))
  )
}
```

### 7.3 截止日期筛选

```typescript
function filterByDueDate(tasks: Task[], filter: DueDateFilter): Task[] {
  const now = new Date()
  switch (filter) {
    case 'today':
      return tasks.filter(t => t.dueAt && isSameDay(new Date(t.dueAt), now))
    case 'week':
      const weekEnd = addDays(now, 7)
      return tasks.filter(t => t.dueAt && new Date(t.dueAt) <= weekEnd)
    case 'overdue':
      return tasks.filter(t => t.dueAt && new Date(t.dueAt) < now && t.status !== 'done')
    default:
      return tasks
  }
}
```

### 7.4 全局配置 v2 → v3 迁移

```typescript
// services/global.ts —— parseGlobalFromGist 内
function migrateMembersToV3(parsed: any): GlobalConfig {
  const membersRaw: any[] = Array.isArray(parsed.members) ? parsed.members : []
  const needMigrate = (parsed.schemaVersion ?? 2) < 3
  const members: Member[] = membersRaw.map(m => ({
    memberId: m.memberId,
    displayName: m.displayName,
    role: m.role,
    password: m.password,
    workspaceId: needMigrate ? null : (m.workspaceId ?? null),
  }))
  return { ...parsed, schemaVersion: 3, members }
}
```

- 仅在内存中迁移；下一次任意写回 global.json 时把 v3 形态覆盖到远端。
- 所有"读 global"调用点统一过 `parseGlobalFromGist`，不需要业务方关心版本号。

### 7.5 成员-工作区登录过滤

```typescript
function visibleMembersForLogin(all: Member[], workspaceId: string): Member[] {
  return all.filter(m =>
    (m.workspaceId === workspaceId || m.workspaceId == null)
    && m.role !== 'admin',
  )
}

function adminCandidate(all: Member[], workspaceId: string): Member | null {
  return all.find(m =>
    m.role === 'admin'
    && (m.workspaceId === workspaceId || m.workspaceId == null),
  ) ?? null
}
```

---

## 8. 权限控制矩阵

| 操作 | 管理员 | 家长 | 学生 |
|------|:-----:|:---:|:---:|
| 创建/编辑工作区 | Y | - | - |
| 管理成员 | Y | - | - |
| 管理标签 | Y | - | - |
| 查看工作区/任务（只读） | Y | - | - |
| 创建任务 | - | Y | - |
| 编辑任务 | - | Y | - |
| 删除任务 | - | Y | - |
| 标记进行中（自己的任务） | - | - | Y |
| 标记完成（自己的任务） | - | - | Y |
| 恢复待办 | - | Y | Y |
| 查看所有任务 | - | Y | - |
| 查看自己的任务 | - | - | Y |
| 搜索任务（全量） | - | Y | - |
| 搜索任务（仅自己） | - | - | Y |

---

## 9. 组件树

```
App.vue
├── GuideView.vue                    // UI-001 首启两步向导（建工作区 → 建初始管理员）
│   ├── CreateWorkspaceDialog.vue    // 仅含名称 + 描述（不再有管理员字段）
│   └── InitialAdminForm.vue         // 显示名 + 6 位密码 + 归属工作区按钮组（默认刚建工作区）
├── WorkspaceListView.vue            // UI-002 工作区列表（来源：全局配置 gist）
│   ├── WorkspaceCard.vue
│   └── CreateWorkspaceDialog.vue    // 已登录管理员可继续创建（同样仅名称 + 描述）
├─��� WorkspaceLoginView.vue           // UI-002a 登录页（提示"请选择登录帐号"；底部工作区选择器仅 ≥2 工作区时显示）
│   ├── MemberPicker.vue             // 仅列 (workspaceId === 当前 || workspaceId == null) && role !== 'admin'
│   ├── PasswordInput.vue            // 6 位口令输入
│   └── AdminLoginDialog.vue         // 管理员入口（仅选人步骤显示；候选 admin 按工作区过滤；无候选时置灰）
├── TaskListView.vue                 // UI-101
│   ├── TopBar.vue                   // 通用：标题（**含工作区名前缀**） + 在线/离线背景色 + 右上角图标按钮（搜索 / 退出）
│   ├── SearchBar.vue                // v-if showSearch（默认 false，由 TopBar 搜索图标切换）
│   ├── FilterBar.vue
│   │   ├── 家长：状态、指派人、截止日期、标签筛选（默认状态=todo、截止=today）
│   │   └── 学生：待办/进行中/完成 三按钮 + 红色数字角标（默认选中"待办"）
│   ├── TaskItem.vue                 // 列表项（含标签色块 + 名称）
│   └── AddTaskButton.vue            // 仅家长可见
├── TaskDetailView.vue               // UI-102（新增显示 开始时间 / 完成时间 / 标签）
│   ├── TaskFieldDisplay.vue
│   ├── TaskEditForm.vue             // 仅家长（创建态隐藏「状态」字段；状态/优先级/指派人/标签均使用按钮组；指派人按钮组仅列 student 且**必填**（未选时保存置灰）；标签必选，无"（无）"选项，新建默认取第一个标签）
│   └── TaskStatusActions.vue        // 仅学生/家长
├── TagManageView.vue                // UI-103
│   ├── TagList.vue
│   └── TagEditDialog.vue
├── MemberManageView.vue             // 显示全部全局成员；每行带"全局" / "工作区名" badge
│   ├── MemberList.vue
│   └── MemberEditDialog.vue         // 含"归属工作区"按钮组（[全局] + 各工作区，默认全局）
├── WorkspaceSettingsView.vue        // UI-104 工作区管理（增删改）
└── AdminHomeView.vue                // UI-200 管理员主页（TopBar 右上角退出图标）
```

---

## 10. 安全设计

### 10.1 认证链路

```
编译时: .env → PAT 注入 Rust 二进制
运行时:
  1. 成员密码验证（与 meta.json 中对应 member.password 比对，角色由该 member.role 决定）
  2. 所有 API 调用携带 PAT (Authorization: token {PAT})
  3. PAT 仅存在于 Rust 侧内存，不暴露给前端 JS
```

### 10.2 敏感数据保护

| 数据 | 存储位置 | 加密 |
|------|---------|------|
| PAT | 编译时注入 + 系统 Keychain | 系统级 |
| 成员密码 | 系统 Keychain（本机当前成员） + meta.json（远端） | 系统级 / 同 gist 安全级 |
| workspaceKey | 系统 Keychain | 系统级 |
| 当前成员 ID | 系统 Keychain | 系统级 |
| 当前工作区 ID | 系统 Keychain / localStorage | 无（非敏感） |

### 10.3 日志安全

- Rust 侧日志仅记录 HTTP 状态码和 gistId，不记录 PAT 和请求体
- 前端 console.log 仅开发环境启用
- 错误提示不包含 PAT、密码等敏感信息

---

## 11. 错误处理策略

### 11.1 前端统一错误处理

```typescript
function handleApiError(error: ApiError) {
  switch (error.code) {
    case 401:
    case 403:
      showError('凭证无效或权限不足')
      router.push('/guide')
      break
    case 404:
      showError('工作区数据不存在')
      break
    case 429:
      showError('请求过于频繁，请稍后再试')
      break
    case 500:
    case 502:
    case 503:
      showError('服务暂时不可用，请稍后再试')
      break
    default:
      showError('网络连接异常，请检查网络')
  }
}
```

### 11.2 网络状态检测

- 每次 API 调用前检查 `navigator.onLine`
- 离线时显示"网络已断开"提示，禁用写入操作
- 恢复在线时自动刷新数据

---

## 12. 文件结构

```
mytodos/
├── src/                          // Vue 3 前端
│   ├── main.ts
│   ├── App.vue
│   ├── router/
│   │   └── index.ts
│   ├── stores/
│   │   ├── auth.ts
│   │   ├── workspace.ts
│   │   ├── task.ts
│   │   ├── tag.ts
│   │   └── ui.ts
│   ├── views/
│   │   ├── GuideView.vue
│   │   ├── WorkspaceListView.vue
│   │   ├── WorkspaceLoginView.vue
│   │   ├── TaskListView.vue
│   │   ├── TaskDetailView.vue
│   │   ├── TagManageView.vue
│   │   └── MemberManageView.vue
│   ├── components/
│   │   ├── common/
│   │   │   ├── TopBar.vue
│   │   │   ├── SearchBar.vue
│   │   │   ├── LoadingSpinner.vue
│   │   │   └── ErrorToast.vue
│   │   ├── guide/
│   │   │   ├── PasswordInput.vue
│   │   │   ├── MemberPicker.vue
│   │   │   └── JoinWorkspaceDialog.vue
│   │   ├── task/
│   │   │   ├── TaskItem.vue
│   │   │   ├── TaskEditForm.vue
│   │   │   ├── FilterBar.vue
│   │   │   └── AddTaskButton.vue
│   │   ├── workspace/
│   │   │   ├── WorkspaceCard.vue
│   │   │   ├── CreateWorkspaceDialog.vue
│   │   │   └── AdminLoginDialog.vue
│   │   ├── tag/
│   │   │   ├── TagList.vue
│   │   │   └── TagEditDialog.vue
│   │   └── member/
│   │       ├── MemberList.vue
│   │       └── MemberEditDialog.vue
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── sort.ts
│   │   ├── filter.ts
│   │   ├── search.ts
│   │   └── date.ts
│   └── assets/
│       └── styles/
│           └── main.css
├── src-tauri/                    // Rust 后端
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/
│   │   │   ├── gist.rs           // Gitee API 命令
│   │   │   └── secure_store.rs   // 安全存储命令
│   │   └── config.rs             // .env 配置读取
│   ├── Cargo.toml
│   └── .env                      // GITEE_PAT=xxx
├── package.json
├── vite.config.ts
└── tsconfig.json
```
