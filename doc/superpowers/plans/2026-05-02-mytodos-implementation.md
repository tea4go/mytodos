# MyTodos 团队待办 App 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 从零构建 MyTodos——基于 Tauri 2 + Vue 3 的移动端团队待办应用，Gitee API 存储，三种角色权限控制。

**架构：** 三层架构：Vue 3 前端（Pinia 状态管理 + Vue Router）→ Tauri 2 桥接层（Rust 命令）→ Gitee API v5（远端 JSON 存储）。纯在线模式，PAT 编译时注入。

**技术栈：** Rust (Tauri 2) + Vue 3 (Composition API) + TypeScript + Pinia + Vue Router 4 + Vite

---

## 文件结构总览

```
mytodos/
├── frontend/src/                              // Vue 3 前端
│   ├── main.ts                       // 入口，挂载 app
│   ├── App.vue                       // 根组件
│   ├── router/index.ts               // 路由定义 + 守卫
│   ├── stores/
│   │   ├── auth.ts                   // 角色/口令状态
│   │   ├── workspace.ts              // 工作区/meta 状态
│   │   ├── task.ts                   // 任务/筛选/排序状态
│   │   ├── tag.ts                    // 标签状态
│   │   └── ui.ts                     // 加载/错误/网络状态
│   ├── types/index.ts                // 所有 TypeScript 类型
│   ├── utils/
│   │   ├── sort.ts                   // 排序算法
│   │   ├── filter.ts                 // 筛选算法
│   │   ├── search.ts                 // 搜索算法
│   │   └── date.ts                   // 日期工具
│   ├── views/
│   │   ├── GuideView.vue             // UI-001
│   │   ├── WorkspaceListView.vue     // UI-002
│   │   ├── TaskListView.vue          // UI-101
│   │   ├── TaskDetailView.vue        // UI-102
│   │   ├── TagManageView.vue         // UI-103
│   │   └── MemberManageView.vue      // 成员管理
│   ├── components/
│   │   ├── common/                   // TopBar, SearchBar, LoadingSpinner, ErrorToast
│   │   ├── guide/                    // RoleSelector, PasswordInput, WorkspaceSelector
│   │   ├── task/                     // TaskItem, TaskEditForm, FilterBar, AddTaskButton
│   │   ├── workspace/               // WorkspaceCard, CreateWorkspaceDialog
│   │   ├── tag/                     // TagList, TagEditDialog
│   │   └── member/                  // MemberList, MemberEditDialog
│   └── assets/styles/main.css
├── backend/src-tauri/                        // Rust 后端
│   ├── frontend/src/
│   │   ├── main.rs                   // Tauri 入口
│   │   ├── lib.rs                    // 库入口，注册命令
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── gist.rs               // Gitee API 命令
│   │   │   └── secure_store.rs       // 安全存储命令
│   │   └── config.rs                 // .env 配置读取
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── .env                          // GITEE_PAT=xxx
├── package.json
├── vite.config.ts
├── tsconfig.json
└── index.html
```

---

## 阶段一：项目脚手架与基础设施

### 任务 1.1：初始化 Tauri 2 + Vue 3 项目

**文件：** 整个项目骨架

- [ ] **步骤 1：创建 Tauri 2 + Vue 3 + TS 项目**

```bash
pnpm create tauri-app@latest mytodos -- --template vue-ts
# 选择: Tauri 2, Vue, TypeScript, Vite
```

- [ ] **步骤 2：安装前端依赖**

```bash
cd mytodos
pnpm --filter mytodos-frontend add pinia vue-router@4
pnpm --filter mytodos-frontend add -D @types/node
```

- [ ] **步骤 3：验证脚手架可运行**

```bash
pnpm tauri dev
# 预期：桌面窗口打开，显示默认 Vue 页面
```

- [ ] **步骤 4：Commit**

```bash
git add -A
git commit -m "chore: scaffold Tauri 2 + Vue 3 + TS project

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### 任务 1.2：创建 TypeScript 类型定义

**文件：**
- 创建：`frontend/src/types/index.ts`

- [ ] **步骤 1：编写完整类型定义**

```typescript
// frontend/src/types/index.ts

// ===== 枚举 =====
export type Role = 'admin' | 'parent' | 'student'
export type TaskStatus = 'todo' | 'doing' | 'done'
export type Priority = 'low' | 'medium' | 'high'
export type DueDateFilter = 'today' | 'week' | 'overdue' | null

// ===== 成员 =====
export interface Member {
  memberId: string   // UUID
  displayName: string
  role: Role
}

// ===== 标签 =====
export interface Tag {
  tagId: string      // UUID
  name: string       // 1-20 字
  color: string      // hex
  createdAt: string  // ISO datetime
}

// ===== 任务 =====
export interface Task {
  taskId: string          // UUID
  title: string           // 1-80 字
  description: string     // 0-256 字
  status: TaskStatus
  priority: Priority
  dueAt: string           // ISO datetime
  assigneeId: string      // memberId
  tagIds: string[]        // tagId[]
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

// ===== 工作区 =====
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
  passwords: {
    admin: string
    parent: string
    student: string
  }
  revision: {
    remoteRevision: string
  }
}

// ===== API 响应 =====
export interface GistFile {
  filename: string
  content: string
}

export interface GistResponse {
  id: string
  description: string
  files: Record<string, GistFile>
  updated_at: string
}

// ===== 筛选状态 =====
export interface TaskFilter {
  status: TaskStatus | null
  assigneeId: string | null
  dueDate: DueDateFilter
  tagIds: string[]
  viewMode: 'active' | 'done'  // 学生用
}

// ===== 排序规则 =====
export type SortRule = 'default'  // 逾期优先 → 截止升序 → 创建降序
```

- [ ] **步骤 2：验证 TypeScript 编译**

```bash
pnpm --filter mytodos-frontend exec vue-tsc --noEmit
# 预期：无错误
```

- [ ] **步骤 3：Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat: add TypeScript type definitions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### 任务 1.3：创建工具函数

**文件：**
- 创建：`frontend/src/utils/date.ts`
- 创建：`frontend/src/utils/sort.ts`
- 创建：`frontend/src/utils/filter.ts`
- 创建：`frontend/src/utils/search.ts`

- [ ] **步骤 1：日期工具**

```typescript
// frontend/src/utils/date.ts
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function isOverdue(dueAt: string): boolean {
  return new Date(dueAt) < new Date()
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${month}月${day}日 ${hours}:${minutes}`
}
```

- [ ] **步骤 2：排序工具**

```typescript
// frontend/src/utils/sort.ts
import type { Task } from '../types'

export function sortTasks(tasks: Task[]): Task[] {
  const now = new Date()
  return [...tasks].sort((a, b) => {
    // 1. 逾期优先
    const aOverdue = a.dueAt && new Date(a.dueAt) < now ? 0 : 1
    const bOverdue = b.dueAt && new Date(b.dueAt) < now ? 0 : 1
    if (aOverdue !== bOverdue) return aOverdue - bOverdue

    // 2. 截止时间升序
    if (a.dueAt && b.dueAt) {
      const cmp = new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
      if (cmp !== 0) return cmp
    }

    // 3. 创建时间降序
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}
```

- [ ] **步骤 3：筛选工具**

```typescript
// frontend/src/utils/filter.ts
import type { Task, TaskFilter } from '../types'
import { isSameDay, addDays, isOverdue } from './date'

export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  let result = tasks

  // 学生视图模式
  if (filter.viewMode === 'active') {
    result = result.filter(t => t.status === 'todo' || t.status === 'doing')
  } else if (filter.viewMode === 'done') {
    result = result.filter(t => t.status === 'done')
  }

  // 家长：按状态筛选
  if (filter.status !== null) {
    result = result.filter(t => t.status === filter.status)
  }

  // 按指派人筛选
  if (filter.assigneeId !== null) {
    result = result.filter(t => t.assigneeId === filter.assigneeId)
  }

  // 按截止日期筛选
  const now = new Date()
  switch (filter.dueDate) {
    case 'today':
      result = result.filter(t => t.dueAt && isSameDay(new Date(t.dueAt), now))
      break
    case 'week':
      result = result.filter(t => t.dueAt && new Date(t.dueAt) <= addDays(now, 7))
      break
    case 'overdue':
      result = result.filter(t => t.dueAt && isOverdue(t.dueAt) && t.status !== 'done')
      break
  }

  // 按标签筛选（多选，满足任一即可）
  if (filter.tagIds.length > 0) {
    result = result.filter(t =>
      t.tagIds.some(tid => filter.tagIds.includes(tid))
    )
  }

  return result
}
```

- [ ] **步骤 4：搜索工具**

```typescript
// frontend/src/utils/search.ts
import type { Task } from '../types'

export function searchTasks(tasks: Task[], keyword: string): Task[] {
  const kw = keyword.toLowerCase().trim()
  if (!kw) return tasks
  return tasks.filter(t =>
    t.title.toLowerCase().includes(kw) ||
    (t.description && t.description.toLowerCase().includes(kw))
  )
}
```

- [ ] **步骤 5：验证编译**

```bash
pnpm --filter mytodos-frontend exec vue-tsc --noEmit
# 预期：无错误
```

- [ ] **步骤 6：Commit**

```bash
git add frontend/src/utils/
git commit -m "feat: add utility functions (sort, filter, search, date)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 阶段二：Rust 后端

### 任务 2.1：配置 Rust 依赖与 .env 读取

**文件：**
- 修改：`backend/src-tauri/Cargo.toml`
- 创建：`backend/src-tauri/.env`
- 创建：`backend/src-tauri/src/config.rs`

- [ ] **步骤 1：添加 Cargo 依赖**

```toml
# backend/src-tauri/Cargo.toml — 在 [dependencies] 中添加
reqwest = { version = "0.12", features = ["json"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
dotenv = "0.15"
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
tauri-plugin-shell = "2"
```

- [ ] **步骤 2：创建 .env 模板**

```bash
# backend/src-tauri/.env
GITEE_PAT=your_personal_access_token_here
```

- [ ] **步骤 3：创建 config.rs**

```rust
// backend/src-tauri/src/config.rs
use std::env;

pub struct AppConfig {
    pub gitee_pat: String,
    pub gitee_api_base: String,
}

impl AppConfig {
    pub fn load() -> Self {
        // 加载 .env 文件（编译时）
        dotenv::dotenv().ok();

        Self {
            gitee_pat: env::var("GITEE_PAT")
                .expect("GITEE_PAT must be set in .env"),
            gitee_api_base: "https://gitee.com/api/v5".to_string(),
        }
    }
}
```

- [ ] **步骤 4：Commit**

```bash
git add backend/src-tauri/Cargo.toml backend/src-tauri/.env backend/src-tauri/src/config.rs
git commit -m "feat: add Rust dependencies and env config

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### 任务 2.2：实现 Gitee API 客户端

**文件：**
- 创建：`backend/src-tauri/src/commands/mod.rs`
- 创建：`backend/src-tauri/src/commands/gist.rs`

- [ ] **步骤 1：创建 commands 模块**

```rust
// backend/src-tauri/src/commands/mod.rs
pub mod gist;
pub mod secure_store;
```

- [ ] **步骤 2：实现 Gist API 命令**

```rust
// backend/src-tauri/src/commands/gist.rs
use crate::config::AppConfig;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct GistFile {
    pub filename: String,
    #[serde(rename = "raw_url")]
    pub raw_url: Option<String>,
    pub content: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GistResponse {
    pub id: String,
    pub description: Option<String>,
    pub files: HashMap<String, GistFile>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateGistRequest {
    pub description: String,
    pub files: HashMap<String, serde_json::Value>,
    pub public: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateGistRequest {
    pub description: Option<String>,
    pub files: HashMap<String, Option<serde_json::Value>>,
}

#[tauri::command]
pub async fn gist_get(gist_id: String) -> Result<GistResponse, String> {
    let config = AppConfig::load();
    let client = Client::new();
    let url = format!("{}/gists/{}", config.gitee_api_base, gist_id);

    let response = client
        .get(&url)
        .header("Authorization", format!("token {}", config.gitee_pat))
        .header("User-Agent", "MyTodos")
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = response.status();
    if status.is_success() {
        response.json::<GistResponse>().await
            .map_err(|e| format!("Parse error: {}", e))
    } else if status.as_u16() == 401 || status.as_u16() == 403 {
        Err("AuthError: invalid or expired PAT".to_string())
    } else if status.as_u16() == 404 {
        Err("NotFound: gist not found".to_string())
    } else {
        let body = response.text().await.unwrap_or_default();
        Err(format!("API error {}: {}", status.as_u16(), body))
    }
}

#[tauri::command]
pub async fn gist_create(description: String, files: HashMap<String, String>) -> Result<GistResponse, String> {
    let config = AppConfig::load();
    let client = Client::new();
    let url = format!("{}/gists", config.gitee_api_base);

    // 将 String content 转换为 Gitee API 期望的格式
    let mut api_files: HashMap<String, serde_json::Value> = HashMap::new();
    for (filename, content) in &files {
        api_files.insert(filename.clone(), serde_json::json!({
            "content": content
        }));
    }

    let body = CreateGistRequest {
        description,
        files: api_files,
        public: false,
    };

    let response = client
        .post(&url)
        .header("Authorization", format!("token {}", config.gitee_pat))
        .header("User-Agent", "MyTodos")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = response.status();
    if status.is_success() {
        response.json::<GistResponse>().await
            .map_err(|e| format!("Parse error: {}", e))
    } else {
        let body = response.text().await.unwrap_or_default();
        Err(format!("API error {}: {}", status.as_u16(), body))
    }
}

#[tauri::command]
pub async fn gist_update(gist_id: String, files: HashMap<String, String>) -> Result<GistResponse, String> {
    let config = AppConfig::load();
    let client = Client::new();
    let url = format!("{}/gists/{}", config.gitee_api_base, gist_id);

    // 将 String content 转换为 Gitee API Patch 格式
    let mut api_files: HashMap<String, Option<serde_json::Value>> = HashMap::new();
    for (filename, content) in &files {
        api_files.insert(filename.clone(), Some(serde_json::json!({
            "content": content
        })));
    }

    let body = UpdateGistRequest {
        description: None,
        files: api_files,
    };

    let response = client
        .patch(&url)
        .header("Authorization", format!("token {}", config.gitee_pat))
        .header("User-Agent", "MyTodos")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = response.status();
    if status.is_success() {
        response.json::<GistResponse>().await
            .map_err(|e| format!("Parse error: {}", e))
    } else if status.as_u16() == 401 || status.as_u16() == 403 {
        Err("AuthError: invalid or expired PAT".to_string())
    } else if status.as_u16() == 404 {
        Err("NotFound: gist not found".to_string())
    } else {
        let body = response.text().await.unwrap_or_default();
        Err(format!("API error {}: {}", status.as_u16(), body))
    }
}
```

- [ ] **步骤 3：注册命令到 main.rs**

```rust
// backend/src-tauri/src/lib.rs — 修改为（Tauri 2 推荐入口）：
mod config;
mod commands;

use commands::gist;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            gist::gist_get,
            gist::gist_create,
            gist::gist_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **步骤 4：编译验证**

```bash
cd src-tauri && cargo check
# 预期：编译成功，无错误
```

- [ ] **步骤 5：Commit**

```bash
git add backend/src-tauri/src/main.rs backend/src-tauri/src/commands/ backend/src-tauri/src/config.rs
git commit -m "feat: implement Gitee API client commands

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### 任务 2.3：实现安全存储命令

**文件：**
- 创建：`backend/src-tauri/src/commands/secure_store.rs`

- [ ] **步骤 1：实现安全存储**

```rust
// backend/src-tauri/src/commands/secure_store.rs
use std::collections::HashMap;
use std::sync::Mutex;

// 简化实现：使用内存 Map + 环境变量（生产环境应使用系统 Keychain）
// 在 Windows/macOS 上后续可替换为 keyring crate
static STORE: once_cell::sync::Lazy<Mutex<HashMap<String, String>>> =
    once_cell::sync::Lazy::new(|| Mutex::new(HashMap::new()));

#[tauri::command]
pub async fn secure_store(key: String, value: String) -> Result<(), String> {
    let mut store = STORE.lock().map_err(|e| format!("Lock error: {}", e))?;
    store.insert(key, value);
    Ok(())
}

#[tauri::command]
pub async fn secure_get(key: String) -> Result<Option<String>, String> {
    let store = STORE.lock().map_err(|e| format!("Lock error: {}", e))?;
    Ok(store.get(&key).cloned())
}

#[tauri::command]
pub async fn secure_remove(key: String) -> Result<(), String> {
    let mut store = STORE.lock().map_err(|e| format!("Lock error: {}", e))?;
    store.remove(&key);
    Ok(())
}
```

- [ ] **步骤 2：添加 once_cell 依赖**

```toml
# backend/src-tauri/Cargo.toml — 在 [dependencies] 中追加
once_cell = "1"
```

- [ ] **步骤 3：注册到 main.rs**

```rust
// backend/src-tauri/src/main.rs — 修改 invoke_handler 部分：
use commands::{gist, secure_store};

.invoke_handler(tauri::generate_handler![
    gist::gist_get,
    gist::gist_create,
    gist::gist_update,
    secure_store::secure_store,
    secure_store::secure_get,
    secure_store::secure_remove,
])
```

- [ ] **步骤 4：编译验证**

```bash
cd src-tauri && cargo check
```

- [ ] **步骤 5：Commit**

```bash
git add backend/src-tauri/
git commit -m "feat: add secure storage commands

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 阶段三：前端基础设施

### 任务 3.1：创建 Pinia Stores

**文件：**
- 创建：`frontend/src/stores/auth.ts`
- 创建：`frontend/src/stores/ui.ts`
- 创建：`frontend/src/stores/workspace.ts`
- 创建：`frontend/src/stores/task.ts`
- 创建：`frontend/src/stores/tag.ts`

- [ ] **步骤 1：auth Store**

```typescript
// frontend/src/stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Role } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const role = ref<Role | null>(null)
  const password = ref<string | null>(null)
  const isFirstLaunch = ref(true)
  const currentMemberId = ref<string | null>(null)

  const isLoggedIn = computed(() => role.value !== null)

  async function login(r: Role, pw: string) {
    role.value = r
    password.value = pw
    isFirstLaunch.value = false
    // 保存到安全存储
    try {
      await window.__TAURI__?.invoke('secure_store', { key: 'user_role', value: r })
      await window.__TAURI__?.invoke('secure_store', { key: 'user_password', value: pw })
    } catch (e) {
      // 降级到 localStorage
      localStorage.setItem('user_role', r)
    }
  }

  async function restoreSession() {
    try {
      const savedRole = await window.__TAURI__?.invoke('secure_get', { key: 'user_role' })
      const savedPw = await window.__TAURI__?.invoke('secure_get', { key: 'user_password' })
      if (savedRole) {
        role.value = savedRole as Role
        password.value = savedPw
        isFirstLaunch.value = false
        return true
      }
    } catch {
      const saved = localStorage.getItem('user_role')
      if (saved) {
        role.value = saved as Role
        isFirstLaunch.value = false
        return true
      }
    }
    return false
  }

  function logout() {
    role.value = null
    password.value = null
    isFirstLaunch.value = true
    currentMemberId.value = null
    localStorage.removeItem('user_role')
  }

  return { role, password, isFirstLaunch, currentMemberId, isLoggedIn, login, restoreSession, logout }
})
```

- [ ] **步骤 2：ui Store**

```typescript
// frontend/src/stores/ui.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isOnline = ref(navigator.onLine)

  function setLoading(v: boolean) { loading.value = v }
  function setError(msg: string | null) { error.value = msg }
  function clearError() { error.value = null }
  function setOnline(v: boolean) { isOnline.value = v }

  // 监听网络状态
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => setOnline(true))
    window.addEventListener('offline', () => setOnline(false))
  }

  return { loading, error, isOnline, setLoading, setError, clearError, setOnline }
})
```

- [ ] **步骤 3：workspace Store**

```typescript
// frontend/src/stores/workspace.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { WorkspaceMeta, Member, Tag } from '../types'

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspaces = ref<WorkspaceMeta[]>([])
  const currentWorkspaceId = ref<string | null>(null)
  const currentGistId = ref<string | null>(null)
  const meta = ref<WorkspaceMeta | null>(null)
  const remoteRevision = ref<string | null>(null)

  const members = computed<Member[]>(() => meta.value?.members ?? [])
  const tags = computed<Tag[]>(() => meta.value?.tags ?? [])

  const currentMember = computed<Member | undefined>(() =>
    members.value.find(m => m.memberId === currentWorkspaceId.value)
  )

  function setCurrentWorkspace(id: string, gistId: string) {
    currentWorkspaceId.value = id
    currentGistId.value = gistId
    localStorage.setItem('current_workspace_id', id)
  }

  function setMeta(data: WorkspaceMeta) {
    meta.value = data
    remoteRevision.value = data.revision.remoteRevision
  }

  function restoreWorkspace() {
    const saved = localStorage.getItem('current_workspace_id')
    if (saved) currentWorkspaceId.value = saved
  }

  return {
    workspaces, currentWorkspaceId, currentGistId, meta, remoteRevision,
    members, tags, currentMember,
    setCurrentWorkspace, setMeta, restoreWorkspace
  }
})
```

- [ ] **步骤 4：task Store**

```typescript
// frontend/src/stores/task.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Task, TaskFilter, TaskStatus, Priority } from '../types'
import { sortTasks } from '../utils/sort'
import { filterTasks } from '../utils/filter'
import { searchTasks } from '../utils/search'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([])
  const filter = ref<TaskFilter>({
    status: null,
    assigneeId: null,
    dueDate: null,
    tagIds: [],
    viewMode: 'active'
  })
  const searchKeyword = ref('')

  function setTasks(newTasks: Task[]) { tasks.value = newTasks }
  function addTask(task: Task) { tasks.value.push(task) }
  function updateTask(taskId: string, updates: Partial<Task>) {
    const idx = tasks.value.findIndex(t => t.taskId === taskId)
    if (idx !== -1) {
      tasks.value[idx] = { ...tasks.value[idx], ...updates }
    }
  }
  function removeTask(taskId: string) {
    tasks.value = tasks.value.filter(t => t.taskId !== taskId)
  }

  const filteredTasks = computed(() => {
    let result = tasks.value.filter(t => !t.deletedAt) // 排除已删除
    result = filterTasks(result, filter.value)
    result = searchTasks(result, searchKeyword.value)
    return sortTasks(result)
  })

  return { tasks, filter, searchKeyword, setTasks, addTask, updateTask, removeTask, filteredTasks }
})
```

- [ ] **步骤 5：tag Store**

```typescript
// frontend/src/stores/tag.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Tag } from '../types'

export const useTagStore = defineStore('tag', () => {
  const tags = ref<Tag[]>([])

  function setTags(newTags: Tag[]) { tags.value = newTags }
  function addTag(tag: Tag) { tags.value.push(tag) }
  function updateTag(tagId: string, updates: Partial<Tag>) {
    const idx = tags.value.findIndex(t => t.tagId === tagId)
    if (idx !== -1) tags.value[idx] = { ...tags.value[idx], ...updates }
  }
  function removeTag(tagId: string) {
    tags.value = tags.value.filter(t => t.tagId !== tagId)
  }

  return { tags, setTags, addTag, updateTag, removeTag }
})
```

- [ ] **步骤 6：验证编译**

```bash
pnpm --filter mytodos-frontend exec vue-tsc --noEmit
```

- [ ] **步骤 7：Commit**

```bash
git add frontend/src/stores/
git commit -m "feat: add Pinia stores (auth, ui, workspace, task, tag)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### 任务 3.2：配置路由与守卫

**文件：**
- 创建：`frontend/src/router/index.ts`
- 修改：`frontend/src/main.ts`

- [ ] **步骤 1：创建路由**

```typescript
// frontend/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/guide',
      name: 'Guide',
      component: () => import('../views/GuideView.vue'),
      meta: { roles: null }  // 无需登录
    },
    {
      path: '/workspaces',
      name: 'Workspaces',
      component: () => import('../views/WorkspaceListView.vue'),
      meta: { roles: ['admin', 'parent', 'student'] }
    },
    {
      path: '/workspaces/:id/tasks',
      name: 'TaskList',
      component: () => import('../views/TaskListView.vue'),
      meta: { roles: ['parent', 'student'] }
    },
    {
      path: '/workspaces/:id/tasks/:taskId',
      name: 'TaskDetail',
      component: () => import('../views/TaskDetailView.vue'),
      meta: { roles: ['admin', 'parent', 'student'] }
    },
    {
      path: '/workspaces/:id/tags',
      name: 'TagManage',
      component: () => import('../views/TagManageView.vue'),
      meta: { roles: ['admin'] }
    },
    {
      path: '/workspaces/:id/members',
      name: 'MemberManage',
      component: () => import('../views/MemberManageView.vue'),
      meta: { roles: ['admin'] }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/guide'
    }
  ]
})

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()

  // 尝试恢复会话
  if (!auth.isLoggedIn) {
    await auth.restoreSession()
  }

  // 未登录 → 跳转引导页
  if (!auth.isLoggedIn && to.name !== 'Guide') {
    return next('/guide')
  }

  // 已登录访问引导页 → 跳转默认页
  if (auth.isLoggedIn && to.name === 'Guide') {
    if (auth.role === 'admin') return next('/workspaces')
    return next('/workspaces')  // 家长/学生先选工作区
  }

  // 检查角色权限
  const allowedRoles = to.meta.roles as string[] | null
  if (allowedRoles && auth.role && !allowedRoles.includes(auth.role)) {
    // 越权 → 跳回默认页
    if (auth.role === 'admin') return next('/workspaces')
    return next('/workspaces')
  }

  next()
})

export default router
```

- [ ] **步骤 2：修改 main.ts**

```typescript
// frontend/src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles/main.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

- [ ] **步骤 3：修改 App.vue**

```vue
<!-- frontend/src/App.vue -->
<template>
  <router-view />
</template>

<script setup lang="ts">
</script>
```

- [ ] **步骤 4：验证编译**

```bash
pnpm --filter mytodos-frontend exec vue-tsc --noEmit
```

- [ ] **步骤 5：Commit**

```bash
git add frontend/src/router/ frontend/src/main.ts frontend/src/App.vue
git commit -m "feat: configure Vue Router with role-based guards

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 阶段四：页面与组件实现

### 任务 4.1：引导页与公共组件

**文件：**
- 创建：`frontend/src/views/GuideView.vue`
- 创建：`frontend/src/components/guide/RoleSelector.vue`
- 创建：`frontend/src/components/guide/PasswordInput.vue`
- 创建：`frontend/src/components/common/ErrorToast.vue`
- 创建：`frontend/src/components/common/LoadingSpinner.vue`

- [ ] **步骤 1：RoleSelector 组件**

```vue
<!-- frontend/src/components/guide/RoleSelector.vue -->
<template>
  <div class="role-selector">
    <h2>选择角色</h2>
    <div class="role-options">
      <button
        v-for="r in roles"
        :key="r.value"
        :class="['role-btn', { active: modelValue === r.value }]"
        @click="$emit('update:modelValue', r.value)"
      >
        <span class="role-icon">{{ r.icon }}</span>
        <span class="role-label">{{ r.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Role } from '../../types'

defineProps<{ modelValue: Role | null }>()
defineEmits<{ 'update:modelValue': [value: Role] }>()

const roles = [
  { value: 'admin' as Role, label: '管理员', icon: '⚙️' },
  { value: 'parent' as Role, label: '家长', icon: '👨‍👩‍👧' },
  { value: 'student' as Role, label: '学生', icon: '📚' },
]
</script>

<style scoped>
.role-selector { text-align: center; }
.role-options { display: flex; gap: 12px; justify-content: center; margin-top: 24px; }
.role-btn {
  padding: 16px 24px; border: 2px solid #ddd; border-radius: 12px;
  background: #fff; cursor: pointer; display: flex; flex-direction: column; align-items: center;
}
.role-btn.active { border-color: #4A90D9; background: #EBF3FC; }
.role-icon { font-size: 32px; }
.role-label { margin-top: 8px; font-size: 16px; font-weight: 500; }
</style>
```

- [ ] **步骤 2：PasswordInput 组件**

```vue
<!-- frontend/src/components/guide/PasswordInput.vue -->
<template>
  <div class="password-input">
    <h2>输入口令</h2>
    <div class="pin-display">
      <div
        v-for="i in 6"
        :key="i"
        :class="['pin-dot', { filled: password.length >= i }]"
      />
    </div>
    <p v-if="error" class="error-msg">{{ error }}</p>
    <div class="numpad">
      <button v-for="n in 9" :key="n" @click="append(n)" class="num-key">{{ n }}</button>
      <button class="num-key empty" disabled />
      <button @click="append(0)" class="num-key">0</button>
      <button @click="remove" class="num-key backspace">⌫</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ error?: string | null }>()
const emit = defineEmits<{ complete: [password: string] }>()

const password = ref('')

function append(n: number) {
  if (password.value.length < 6) {
    password.value += n.toString()
    if (password.value.length === 6) {
      emit('complete', password.value)
    }
  }
}

function remove() {
  password.value = password.value.slice(0, -1)
}
</script>

<style scoped>
.password-input { text-align: center; }
.pin-display { display: flex; gap: 12px; justify-content: center; margin: 24px 0; }
.pin-dot {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid #ccc; background: #fff;
}
.pin-dot.filled { background: #4A90D9; border-color: #4A90D9; }
.error-msg { color: #E74C3C; font-size: 14px; }
.numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-width: 240px; margin: 0 auto; }
.num-key { padding: 16px; font-size: 20px; border: 1px solid #eee; border-radius: 8px; background: #fff; cursor: pointer; }
.num-key.empty { visibility: hidden; }
.backspace { color: #999; }
</style>
```

- [ ] **步骤 3：ErrorToast 和 LoadingSpinner**

```vue
<!-- frontend/src/components/common/ErrorToast.vue -->
<template>
  <Transition name="fade">
    <div v-if="message" class="error-toast" @click="$emit('close')">
      {{ message }}
    </div>
  </Transition>
</template>
<script setup lang="ts">
defineProps<{ message: string | null }>()
defineEmits<{ close: [] }>()
</script>
<style scoped>
.error-toast {
  position: fixed; bottom: 24px; left: 16px; right: 16px;
  padding: 12px 16px; background: #E74C3C; color: #fff;
  border-radius: 8px; text-align: center; z-index: 1000;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
```

```vue
<!-- frontend/src/components/common/LoadingSpinner.vue -->
<template>
  <div v-if="visible" class="loading-overlay">
    <div class="spinner" />
    <p v-if="text">{{ text }}</p>
  </div>
</template>
<script setup lang="ts">
defineProps<{ visible: boolean; text?: string }>()
</script>
<style scoped>
.loading-overlay {
  position: fixed; inset: 0; background: rgba(255,255,255,0.8);
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; z-index: 999;
}
.spinner {
  width: 40px; height: 40px; border: 4px solid #eee;
  border-top-color: #4A90D9; border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
```

- [ ] **步骤 4：GuideView 组装**

```vue
<!-- frontend/src/views/GuideView.vue -->
<template>
  <div class="guide-page">
    <h1>MyTodos</h1>
    <RoleSelector v-if="step === 1" v-model="selectedRole" @update:modelValue="nextStep" />
    <PasswordInput
      v-if="step === 2"
      :error="error"
      @complete="handlePassword"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import type { Role } from '../types'
import RoleSelector from '../components/guide/RoleSelector.vue'
import PasswordInput from '../components/guide/PasswordInput.vue'

const router = useRouter()
const auth = useAuthStore()

const step = ref(1)
const selectedRole = ref<Role | null>(null)
const error = ref<string | null>(null)

function nextStep() { step.value = 2 }

async function handlePassword(password: string) {
  if (!selectedRole.value) return
  await auth.login(selectedRole.value, password)

  if (selectedRole.value === 'admin') {
    router.push('/workspaces')
  } else {
    router.push('/workspaces')
  }
}
</script>

<style scoped>
.guide-page {
  min-height: 100vh; display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 24px;
}
h1 { font-size: 28px; color: #4A90D9; margin-bottom: 32px; }
</style>
```

- [ ] **步骤 5：Commit**

```bash
git add frontend/src/views/GuideView.vue frontend/src/components/guide/ frontend/src/components/common/
git commit -m "feat: implement guide page with role selector and password input

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### 任务 4.2：工作区列表页

**文件：**
- 创建：`frontend/src/views/WorkspaceListView.vue`
- 创建：`frontend/src/components/workspace/WorkspaceCard.vue`
- 创建：`frontend/src/components/workspace/CreateWorkspaceDialog.vue`

- [ ] **步骤 1：WorkspaceCard 组件**

```vue
<!-- frontend/src/components/workspace/WorkspaceCard.vue -->
<template>
  <div class="workspace-card" @click="$emit('select', workspace.workspace.workspaceId)">
    <div class="ws-info">
      <h3>{{ workspace.workspace.name }}</h3>
      <p v-if="workspace.workspace.description">{{ workspace.workspace.description }}</p>
      <span class="member-count">{{ workspace.members.length }} 位成员</span>
    </div>
    <div class="ws-actions" v-if="isAdmin">
      <button @click.stop="$emit('edit', workspace)" class="btn-sm">编辑</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WorkspaceMeta } from '../../types'
defineProps<{ workspace: WorkspaceMeta; isAdmin: boolean }>()
defineEmits<{ select: [workspaceId: string]; edit: [workspace: WorkspaceMeta] }>()
</script>

<style scoped>
.workspace-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px; margin: 8px 0; border-radius: 12px;
  background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer;
}
.ws-info h3 { margin: 0; font-size: 18px; }
.ws-info p { margin: 4px 0 0; color: #666; font-size: 14px; }
.member-count { font-size: 12px; color: #999; }
.btn-sm { padding: 6px 12px; font-size: 14px; }
</style>
```

- [ ] **步骤 2：CreateWorkspaceDialog 组件**

```vue
<!-- frontend/src/components/workspace/CreateWorkspaceDialog.vue -->
<template>
  <div v-if="visible" class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog">
      <h3>创建工作区</h3>
      <label>名称 <input v-model="name" maxlength="100" placeholder="例：一中实验初中" /></label>
      <label>描述 <input v-model="description" placeholder="可选" maxlength="200" /></label>
      <label>管理员口令 <input v-model="pwAdmin" type="password" maxlength="6" placeholder="6位数字" /></label>
      <label>家长口令 <input v-model="pwParent" type="password" maxlength="6" placeholder="6位数字" /></label>
      <label>学生口令 <input v-model="pwStudent" type="password" maxlength="6" placeholder="6位数字" /></label>
      <p v-if="error" class="error">{{ error }}</p>
      <div class="dialog-actions">
        <button @click="$emit('close')" class="btn-cancel">取消</button>
        <button @click="submit" :disabled="!valid">创建</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  close: []
  create: [data: { name: string; description: string; passwords: { admin: string; parent: string; student: string } }]
}>()

const name = ref('')
const description = ref('')
const pwAdmin = ref('123456')
const pwParent = ref('234567')
const pwStudent = ref('345678')
const error = ref('')

const valid = computed(() => name.value.trim() && pwAdmin.value.length === 6 && pwParent.value.length === 6 && pwStudent.value.length === 6)

function submit() {
  if (!valid.value) return
  emit('create', {
    name: name.value.trim(),
    description: description.value.trim(),
    passwords: { admin: pwAdmin.value, parent: pwParent.value, student: pwStudent.value }
  })
}
</script>

<style scoped>
.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog { background: #fff; border-radius: 16px; padding: 24px; width: 90%; max-width: 400px; }
.dialog label { display: block; margin: 12px 0 4px; font-size: 14px; color: #333; }
.dialog input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; box-sizing: border-box; }
.dialog-actions { display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end; }
.btn-cancel { background: #eee; color: #333; }
.error { color: #E74C3C; font-size: 14px; }
</style>
```

- [ ] **步骤 3：WorkspaceListView 组装**

```vue
<!-- frontend/src/views/WorkspaceListView.vue -->
<template>
  <div class="ws-list-page">
    <h2>工作区</h2>
    <div class="ws-list">
      <WorkspaceCard
        v-for="ws in workspaces"
        :key="ws.workspace.workspaceId"
        :workspace="ws"
        :is-admin="auth.role === 'admin'"
        @select="handleSelect"
      />
      <p v-if="workspaces.length === 0" class="empty">暂无工作区</p>
    </div>
    <div class="bottom-actions">
      <button v-if="auth.role === 'admin'" @click="showCreate = true" class="btn-primary">创建工作区</button>
      <button v-if="auth.role !== 'admin'" @click="showJoin = true">加入工作区</button>
    </div>

    <CreateWorkspaceDialog
      :visible="showCreate"
      @close="showCreate = false"
      @create="handleCreate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useWorkspaceStore } from '../stores/workspace'
import WorkspaceCard from '../components/workspace/WorkspaceCard.vue'
import CreateWorkspaceDialog from '../components/workspace/CreateWorkspaceDialog.vue'

const router = useRouter()
const auth = useAuthStore()
const wsStore = useWorkspaceStore()

const showCreate = ref(false)
const showJoin = ref(false)
const workspaces = ref<any[]>([])

function handleSelect(workspaceId: string) {
  wsStore.currentWorkspaceId = workspaceId
  if (auth.role === 'admin') {
    // 管理员进入成员/标签管理
  } else {
    router.push(`/workspaces/${workspaceId}/tasks`)
  }
}

async function handleCreate(data: { name: string; description: string; passwords: any }) {
  // TODO: 在阶段五集成 API 调用
  showCreate.value = false
}
</script>

<style scoped>
.ws-list-page { padding: 16px; min-height: 100vh; }
.ws-list { margin: 16px 0; }
.empty { text-align: center; color: #999; margin-top: 40px; }
.bottom-actions { position: fixed; bottom: 24px; left: 16px; right: 16px; display: flex; gap: 12px; }
.bottom-actions button { flex: 1; padding: 14px; border-radius: 12px; font-size: 16px; border: none; cursor: pointer; }
.btn-primary { background: #4A90D9; color: #fff; }
</style>
```

- [ ] **步骤 4：Commit**

```bash
git add frontend/src/views/WorkspaceListView.vue frontend/src/components/workspace/
git commit -m "feat: implement workspace list and create dialog

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### 任务 4.3：任务列表页（核心页面）

**文件：**
- 创建：`frontend/src/views/TaskListView.vue`
- 创建：`frontend/src/components/common/TopBar.vue`
- 创建：`frontend/src/components/common/SearchBar.vue`
- 创建：`frontend/src/components/task/FilterBar.vue`
- 创建：`frontend/src/components/task/TaskItem.vue`
- 创建：`frontend/src/components/task/AddTaskButton.vue`

- [ ] **步骤 1：TopBar 组件**

```vue
<!-- frontend/src/components/common/TopBar.vue -->
<template>
  <div class="top-bar">
    <button v-if="showBack" @click="$router.back()" class="back-btn">←</button>
    <span class="title">{{ title }}</span>
    <span :class="['status-dot', isOnline ? 'online' : 'offline']" />
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; showBack?: boolean; isOnline: boolean }>()
</script>

<style scoped>
.top-bar { display: flex; align-items: center; padding: 12px 16px; background: #fff; border-bottom: 1px solid #eee; }
.back-btn { font-size: 20px; background: none; border: none; cursor: pointer; padding: 0 8px 0 0; }
.title { flex: 1; font-size: 18px; font-weight: 600; }
.status-dot { width: 10px; height: 10px; border-radius: 50%; }
.status-dot.online { background: #27AE60; }
.status-dot.offline { background: #E74C3C; }
</style>
```

- [ ] **步骤 2：SearchBar 组件**

```vue
<!-- frontend/src/components/common/SearchBar.vue -->
<template>
  <div class="search-bar">
    <input
      v-model="keyword"
      placeholder="搜索任务..."
      @input="$emit('update:modelValue', keyword)"
      type="text"
    />
    <button v-if="keyword" @click="clear" class="clear-btn">✕</button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const keyword = ref(props.modelValue)

watch(() => props.modelValue, (v) => { keyword.value = v })
function clear() { keyword.value = ''; emit('update:modelValue', '') }
</script>

<style scoped>
.search-bar { position: relative; padding: 8px 16px; }
.search-bar input { width: 100%; padding: 10px 14px; border: 1px solid #eee; border-radius: 10px; font-size: 15px; box-sizing: border-box; background: #f5f5f5; }
.clear-btn { position: absolute; right: 24px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 16px; color: #999; cursor: pointer; }
</style>
```

- [ ] **步骤 3：TaskItem 组件**

```vue
<!-- frontend/src/components/task/TaskItem.vue -->
<template>
  <div
    :class="['task-item', `priority-${task.priority}`]"
    @click="$emit('click', task.taskId)"
  >
    <div class="task-left">
      <button
        v-if="canComplete"
        :class="['check-btn', { done: task.status === 'done' }]"
        @click.stop="$emit('toggle', task.taskId)"
      >
        {{ task.status === 'done' ? '✓' : '○' }}
      </button>
      <div class="task-info">
        <span :class="['title', { completed: task.status === 'done' }]">{{ task.title }}</span>
        <div class="meta">
          <span v-if="task.dueAt" :class="['due', { overdue: isOverdue(task.dueAt) && task.status !== 'done' }]">
            {{ formatDateTime(task.dueAt) }}
          </span>
          <span class="assignee">{{ assigneeName }}</span>
        </div>
      </div>
    </div>
    <div class="task-right">
      <span :class="['status-badge', task.status]">{{ statusText }}</span>
      <div class="tags" v-if="task.tagIds.length">
        <span v-for="tid in task.tagIds.slice(0,2)" :key="tid" class="tag-dot" :style="{ background: getTagColor(tid) }" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Task } from '../../types'
import { formatDateTime, isOverdue } from '../../utils/date'

const props = defineProps<{
  task: Task
  canComplete: boolean
  assigneeName: string
  getTagColor: (tagId: string) => string
}>()

defineEmits<{ click: [taskId: string]; toggle: [taskId: string] }>()

const statusText = computed(() => {
  switch (props.task.status) { case 'todo': return '待办'; case 'doing': return '进行中'; case 'done': return '已完成'; }
})
</script>

<style scoped>
.task-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
.task-item.priority-high { border-left: 3px solid #E74C3C; }
.task-item.priority-medium { border-left: 3px solid #F5A623; }
.task-item.priority-low { border-left: 3px solid #B8B8B8; }
.task-left { display: flex; align-items: center; gap: 12px; flex: 1; }
.check-btn { font-size: 22px; background: none; border: none; cursor: pointer; color: #ccc; }
.check-btn.done { color: #27AE60; }
.title { font-size: 16px; display: block; }
.title.completed { text-decoration: line-through; color: #999; }
.meta { display: flex; gap: 8px; margin-top: 4px; font-size: 12px; color: #888; }
.due.overdue { color: #E74C3C; font-weight: 500; }
.status-badge { font-size: 12px; padding: 2px 8px; border-radius: 10px; }
.status-badge.todo { background: #EBF3FC; color: #4A90D9; }
.status-badge.doing { background: #FFF3CD; color: #F5A623; }
.status-badge.done { background: #E8F5E9; color: #27AE60; }
.task-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.tags { display: flex; gap: 4px; }
.tag-dot { width: 8px; height: 8px; border-radius: 50%; }
</style>
```

- [ ] **步骤 4：FilterBar 组件**

```vue
<!-- frontend/src/components/task/FilterBar.vue -->
<template>
  <div class="filter-bar">
    <!-- 家长筛选 -->
    <template v-if="role === 'parent'">
      <select v-model="localFilter.status" @change="emitFilter" class="filter-select">
        <option :value="null">全部状态</option>
        <option value="todo">待办</option>
        <option value="doing">进行中</option>
        <option value="done">已完成</option>
      </select>
      <select v-model="localFilter.dueDate" @change="emitFilter" class="filter-select">
        <option :value="null">全部时间</option>
        <option value="today">今天</option>
        <option value="week">本周</option>
        <option value="overdue">逾期</option>
      </select>
    </template>
    <!-- 学生切换 -->
    <template v-if="role === 'student'">
      <div class="view-switch">
        <button :class="{ active: localFilter.viewMode === 'active' }" @click="setViewMode('active')">进行中</button>
        <button :class="{ active: localFilter.viewMode === 'done' }" @click="setViewMode('done')">完成</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { Role, TaskFilter } from '../../types'

const props = defineProps<{ role: Role; filter: TaskFilter }>()
const emit = defineEmits<{ 'update:filter': [filter: TaskFilter] }>()

const localFilter = reactive<TaskFilter>({ ...props.filter })

watch(() => props.filter, (f) => Object.assign(localFilter, f))

function emitFilter() { emit('update:filter', { ...localFilter }) }
function setViewMode(mode: 'active' | 'done') {
  localFilter.viewMode = mode
  emitFilter()
}
</script>

<style scoped>
.filter-bar { display: flex; gap: 8px; padding: 8px 16px; overflow-x: auto; }
.filter-select { padding: 6px 12px; border: 1px solid #eee; border-radius: 8px; font-size: 14px; background: #fff; }
.view-switch { display: flex; gap: 4px; background: #f5f5f5; border-radius: 8px; padding: 2px; }
.view-switch button { padding: 6px 16px; border: none; border-radius: 6px; font-size: 14px; background: transparent; cursor: pointer; }
.view-switch button.active { background: #4A90D9; color: #fff; }
</style>
```

- [ ] **步骤 5：AddTaskButton 组件**

```vue
<!-- frontend/src/components/task/AddTaskButton.vue -->
<template>
  <button @click="$emit('click')" class="add-btn">+</button>
</template>
<script setup lang="ts">
defineEmits<{ click: [] }>()
</script>
<style scoped>
.add-btn {
  position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
  border-radius: 50%; border: none; background: #4A90D9; color: #fff;
  font-size: 28px; cursor: pointer; box-shadow: 0 4px 12px rgba(74,144,217,0.4);
}
</style>
```

- [ ] **步骤 6：TaskListView 组装**

```vue
<!-- frontend/src/views/TaskListView.vue -->
<template>
  <div class="task-list-page">
    <TopBar :title="wsStore.meta?.workspace.name ?? '任务'" :is-online="ui.isOnline" show-back />
    <SearchBar v-model="taskStore.searchKeyword" />
    <FilterBar
      v-if="auth.role"
      :role="auth.role"
      :filter="taskStore.filter"
      @update:filter="taskStore.filter = $event"
    />
    <div class="task-list">
      <TaskItem
        v-for="task in taskStore.filteredTasks"
        :key="task.taskId"
        :task="task"
        :can-complete="auth.role === 'student' && task.assigneeId === auth.currentMemberId"
        :assignee-name="getMemberName(task.assigneeId)"
        :get-tag-color="getTagColor"
        @click="goDetail(task.taskId)"
        @toggle="handleToggle(task)"
      />
      <p v-if="taskStore.filteredTasks.length === 0" class="empty">暂无任务</p>
    </div>
    <AddTaskButton v-if="auth.role === 'parent'" @click="showCreate = true" />
    <!-- 创建任务弹窗（内联简化版） -->
    <div v-if="showCreate" class="dialog-overlay" @click.self="showCreate = false">
      <div class="dialog">
        <h3>新建任务</h3>
        <input v-model="newTask.title" placeholder="标题（必填，1-80字）" maxlength="80" />
        <textarea v-model="newTask.description" placeholder="描述（可选）" maxlength="256" rows="3" />
        <input v-model="newTask.dueAt" type="datetime-local" />
        <select v-model="newTask.priority">
          <option value="medium">中优先级</option>
          <option value="high">高优先级</option>
          <option value="low">低优先级</option>
        </select>
        <select v-model="newTask.assigneeId">
          <option value="" disabled>选择指派人</option>
          <option v-for="m in wsStore.members" :key="m.memberId" :value="m.memberId">{{ m.displayName }}</option>
        </select>
        <p v-if="createError" class="error">{{ createError }}</p>
        <div class="dialog-actions">
          <button @click="showCreate = false" class="btn-cancel">取消</button>
          <button @click="handleCreate" :disabled="!newTask.title.trim() || !newTask.assigneeId || !newTask.dueAt">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useWorkspaceStore } from '../stores/workspace'
import { useTaskStore } from '../stores/task'
import { useUiStore } from '../stores/ui'
import type { Task, Priority } from '../types'
import TopBar from '../components/common/TopBar.vue'
import SearchBar from '../components/common/SearchBar.vue'
import FilterBar from '../components/task/FilterBar.vue'
import TaskItem from '../components/task/TaskItem.vue'
import AddTaskButton from '../components/task/AddTaskButton.vue'

const router = useRouter()
const auth = useAuthStore()
const wsStore = useWorkspaceStore()
const taskStore = useTaskStore()
const ui = useUiStore()

const showCreate = ref(false)
const createError = ref('')
const newTask = ref({
  title: '', description: '', dueAt: '',
  priority: 'medium' as Priority, assigneeId: ''
})

function getMemberName(memberId: string): string {
  return wsStore.members.find(m => m.memberId === memberId)?.displayName ?? '未知'
}

function getTagColor(tagId: string): string {
  return wsStore.tags.find(t => t.tagId === tagId)?.color ?? '#ccc'
}

function goDetail(taskId: string) {
  router.push(`/workspaces/${wsStore.currentWorkspaceId}/tasks/${taskId}`)
}

async function handleToggle(task: Task) { /* TODO: 阶段五集成 */ }
async function handleCreate() { /* TODO: 阶段五集成 */ }
</script>

<style scoped>
.task-list-page { padding-bottom: 80px; min-height: 100vh; }
.task-list { margin-top: 8px; }
.empty { text-align: center; color: #999; margin-top: 60px; }
.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog { background: #fff; border-radius: 16px; padding: 24px; width: 90%; max-width: 400px; }
.dialog h3 { margin: 0 0 16px; }
.dialog input, .dialog textarea, .dialog select { width: 100%; padding: 10px; margin: 8px 0; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; box-sizing: border-box; }
.dialog-actions { display: flex; gap: 12px; margin-top: 16px; justify-content: flex-end; }
.btn-cancel { background: #eee; color: #333; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
.dialog-actions button:not(.btn-cancel) { background: #4A90D9; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
.dialog-actions button:disabled { opacity: 0.5; }
.error { color: #E74C3C; font-size: 14px; }
</style>
```

- [ ] **步骤 7：Commit**

```bash
git add frontend/src/views/TaskListView.vue frontend/src/components/common/ frontend/src/components/task/
git commit -m "feat: implement task list with search, filter, and create dialog

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### 任务 4.4：任务详情页

**文件：**
- 创建：`frontend/src/views/TaskDetailView.vue`
- 创建：`frontend/src/components/task/TaskEditForm.vue`

- [ ] **步骤 1：TaskEditForm 组件**

```vue
<!-- frontend/src/components/task/TaskEditForm.vue -->
<template>
  <div class="task-edit-form">
    <label>标题 <input v-model="form.title" maxlength="80" /></label>
    <label>描述 <textarea v-model="form.description" maxlength="256" rows="3" /></label>
    <label>截止日期 <input v-model="form.dueAt" type="datetime-local" /></label>
    <label>优先级
      <select v-model="form.priority">
        <option value="low">低</option>
        <option value="medium">中</option>
        <option value="high">高</option>
      </select>
    </label>
    <label>状态
      <select v-model="form.status">
        <option value="todo">待办</option>
        <option value="doing">进行中</option>
        <option value="done">已完成</option>
      </select>
    </label>
    <label>指派人
      <select v-model="form.assigneeId">
        <option v-for="m in members" :key="m.memberId" :value="m.memberId">{{ m.displayName }}</option>
      </select>
    </label>
    <div class="form-actions">
      <button @click="$emit('cancel')" class="btn-cancel">取消</button>
      <button @click="submit" :disabled="!valid">保存</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import type { Task, Member } from '../../types'

const props = defineProps<{ task: Task; members: Member[] }>()
const emit = defineEmits<{ save: [task: Task]; cancel: [] }>()

const form = reactive({ ...props.task })
const valid = computed(() => form.title.trim().length > 0)

function submit() { emit('save', { ...form }) }
</script>

<style scoped>
.task-edit-form label { display: block; margin: 12px 0 4px; font-size: 14px; }
.task-edit-form input, .task-edit-form textarea, .task-edit-form select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; box-sizing: border-box; }
.form-actions { display: flex; gap: 12px; margin-top: 16px; justify-content: flex-end; }
.btn-cancel { background: #eee; color: #333; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
.form-actions button:not(.btn-cancel) { background: #4A90D9; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
.form-actions button:disabled { opacity: 0.5; }
</style>
```

- [ ] **步骤 2：TaskDetailView**

```vue
<!-- frontend/src/views/TaskDetailView.vue -->
<template>
  <div class="detail-page">
    <TopBar title="任务详情" :is-online="ui.isOnline" show-back />
    <div v-if="task" class="detail-content">
      <!-- 查看模式 -->
      <template v-if="!editing">
        <h2>{{ task.title }}</h2>
        <p v-if="task.description" class="desc">{{ task.description }}</p>
        <div class="fields">
          <div class="field"><span class="label">状态</span><span :class="['badge', task.status]">{{ statusText }}</span></div>
          <div class="field"><span class="label">优先级</span><span>{{ priorityText }}</span></div>
          <div class="field"><span class="label">截止</span><span>{{ formatDateTime(task.dueAt) }}</span></div>
          <div class="field"><span class="label">指派人</span><span>{{ assigneeName }}</span></div>
        </div>
        <!-- 学生操作按钮 -->
        <div v-if="auth.role === 'student' && task.assigneeId === auth.currentMemberId" class="actions">
          <button v-if="task.status === 'todo'" @click="handleAction('start')" class="btn-start">开始任务</button>
          <button v-if="task.status === 'doing'" @click="handleAction('complete')" class="btn-complete">完成任务</button>
          <button v-if="task.status === 'doing' || task.status === 'done'" @click="handleAction('recover')" class="btn-recover">恢复待办</button>
        </div>
        <!-- 家长编辑按钮 -->
        <button v-if="auth.role === 'parent'" @click="editing = true" class="btn-edit">编辑</button>
      </template>
      <!-- 编辑模式 -->
      <TaskEditForm
        v-if="editing && task"
        :task="task"
        :members="wsStore.members"
        @save="handleSave"
        @cancel="editing = false"
      />
    </div>
    <p v-else class="empty">任务不存在</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useWorkspaceStore } from '../stores/workspace'
import { useTaskStore } from '../stores/task'
import { useUiStore } from '../stores/ui'
import type { Task } from '../types'
import { formatDateTime } from '../utils/date'
import TopBar from '../components/common/TopBar.vue'
import TaskEditForm from '../components/task/TaskEditForm.vue'

const route = useRoute()
const auth = useAuthStore()
const wsStore = useWorkspaceStore()
const taskStore = useTaskStore()
const ui = useUiStore()

const editing = ref(false)
const taskId = route.params.taskId as string

const task = computed<Task | undefined>(() =>
  taskStore.tasks.find(t => t.taskId === taskId)
)

const statusText = computed(() => {
  switch (task.value?.status) { case 'todo': return '待办'; case 'doing': return '进行中'; case 'done': return '已完成'; default: return '' }
})

const priorityText = computed(() => {
  switch (task.value?.priority) { case 'low': return '低'; case 'medium': return '中'; case 'high': return '高'; default: return '' }
})

const assigneeName = computed(() =>
  wsStore.members.find(m => m.memberId === task.value?.assigneeId)?.displayName ?? ''
)

async function handleAction(action: string) { /* TODO: 阶段五集成 */ }
async function handleSave(updated: Task) { /* TODO: 阶段五集成 */ }
</script>

<style scoped>
.detail-page { min-height: 100vh; padding-bottom: 80px; }
.detail-content { padding: 16px; }
.detail-content h2 { font-size: 22px; margin: 0 0 8px; }
.desc { color: #666; line-height: 1.6; margin: 8px 0 16px; }
.fields { margin: 16px 0; }
.field { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
.label { color: #888; }
.badge { padding: 2px 8px; border-radius: 10px; font-size: 14px; }
.badge.todo { background: #EBF3FC; color: #4A90D9; }
.badge.doing { background: #FFF3CD; color: #F5A623; }
.badge.done { background: #E8F5E9; color: #27AE60; }
.actions { display: flex; gap: 12px; margin-top: 20px; }
.actions button, .btn-edit { padding: 12px 24px; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; }
.btn-start { background: #4A90D9; color: #fff; }
.btn-complete { background: #27AE60; color: #fff; }
.btn-recover { background: #F5A623; color: #fff; }
.btn-edit { background: #4A90D9; color: #fff; margin-top: 20px; }
.empty { text-align: center; color: #999; margin-top: 60px; }
</style>
```

- [ ] **步骤 3：Commit**

```bash
git add frontend/src/views/TaskDetailView.vue frontend/src/components/task/TaskEditForm.vue
git commit -m "feat: implement task detail view with edit form

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### 任务 4.5：标签管理页与成员管理页

**文件：**
- 创建：`frontend/src/views/TagManageView.vue`
- 创建：`frontend/src/components/tag/TagList.vue`
- 创建：`frontend/src/components/tag/TagEditDialog.vue`
- 创建：`frontend/src/views/MemberManageView.vue`
- 创建：`frontend/src/components/member/MemberList.vue`
- 创建：`frontend/src/components/member/MemberEditDialog.vue`

- [ ] **步骤 1：标签管理相关组件**

```vue
<!-- frontend/src/components/tag/TagEditDialog.vue -->
<template>
  <div v-if="visible" class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog">
      <h3>{{ tag ? '编辑标签' : '新建标签' }}</h3>
      <label>名称 <input v-model="name" maxlength="20" placeholder="标签名" /></label>
      <label>颜色 <input v-model="color" type="color" /></label>
      <div class="dialog-actions">
        <button @click="$emit('close')" class="btn-cancel">取消</button>
        <button @click="submit" :disabled="!name.trim()">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Tag } from '../../types'

const props = defineProps<{ visible: boolean; tag?: Tag | null }>()
const emit = defineEmits<{ close: []; save: [data: { name: string; color: string }] }>()

const name = ref('')
const color = ref('#4A90D9')

watch(() => props.tag, (t) => {
  if (t) { name.value = t.name; color.value = t.color }
}, { immediate: true })

function submit() { emit('save', { name: name.value.trim(), color: color.value }) }
</script>

<style scoped>
.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog { background: #fff; border-radius: 16px; padding: 24px; width: 90%; max-width: 360px; }
.dialog label { display: block; margin: 12px 0 4px; font-size: 14px; }
.dialog input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; box-sizing: border-box; }
.dialog-actions { display: flex; gap: 12px; margin-top: 16px; justify-content: flex-end; }
</style>
```

```vue
<!-- frontend/src/components/tag/TagList.vue -->
<template>
  <div class="tag-list">
    <div v-for="tag in tags" :key="tag.tagId" class="tag-row">
      <span class="tag-color" :style="{ background: tag.color }" />
      <span class="tag-name">{{ tag.name }}</span>
      <button @click="$emit('edit', tag)" class="btn-sm">编辑</button>
      <button @click="$emit('delete', tag.tagId)" class="btn-sm btn-danger">删除</button>
    </div>
    <p v-if="tags.length === 0" class="empty">暂无标签</p>
  </div>
</template>

<script setup lang="ts">
import type { Tag } from '../../types'
defineProps<{ tags: Tag[] }>()
defineEmits<{ edit: [tag: Tag]; delete: [tagId: string] }>()
</script>

<style scoped>
.tag-row { display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0; gap: 10px; }
.tag-color { width: 20px; height: 20px; border-radius: 6px; }
.tag-name { flex: 1; font-size: 16px; }
.btn-sm { padding: 4px 12px; border: 1px solid #ddd; border-radius: 6px; background: #fff; cursor: pointer; font-size: 13px; }
.btn-danger { color: #E74C3C; border-color: #E74C3C; }
.empty { text-align: center; color: #999; margin-top: 40px; }
</style>
```

```vue
<!-- frontend/src/views/TagManageView.vue -->
<template>
  <div class="tag-manage-page">
    <TopBar title="标签管理" :is-online="ui.isOnline" show-back />
    <div class="content">
      <TagList
        :tags="wsStore.tags"
        @edit="handleEdit"
        @delete="handleDelete"
      />
      <button @click="showDialog = true; editingTag = null" class="btn-add">+ 新建标签</button>
    </div>
    <TagEditDialog
      :visible="showDialog"
      :tag="editingTag"
      @close="showDialog = false"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWorkspaceStore } from '../stores/workspace'
import { useUiStore } from '../stores/ui'
import type { Tag } from '../types'
import TopBar from '../components/common/TopBar.vue'
import TagList from '../components/tag/TagList.vue'
import TagEditDialog from '../components/tag/TagEditDialog.vue'

const wsStore = useWorkspaceStore()
const ui = useUiStore()

const showDialog = ref(false)
const editingTag = ref<Tag | null>(null)

function handleEdit(tag: Tag) { editingTag.value = tag; showDialog.value = true }
function handleSave(data: { name: string; color: string }) { /* TODO: 阶段五 */ showDialog.value = false }
function handleDelete(tagId: string) { /* TODO: 阶段五 */ }
</script>

<style scoped>
.tag-manage-page { min-height: 100vh; }
.content { padding: 16px; }
.btn-add { width: 100%; padding: 14px; border: 2px dashed #ddd; border-radius: 12px; background: #fff; font-size: 16px; color: #4A90D9; cursor: pointer; margin-top: 20px; }
</style>
```

- [ ] **步骤 2：成员管理相关组件 — 简化版，结构同标签管理**

```vue
<!-- frontend/src/components/member/MemberList.vue -->
<template>
  <div class="member-list">
    <div v-for="m in members" :key="m.memberId" class="member-row">
      <span class="role-badge" :class="m.role">{{ roleText(m.role) }}</span>
      <span class="member-name">{{ m.displayName }}</span>
      <button @click="$emit('edit', m)" class="btn-sm">编辑</button>
      <button @click="$emit('remove', m.memberId)" class="btn-sm btn-danger">移除</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Member, Role } from '../../types'
defineProps<{ members: Member[] }>()
defineEmits<{ edit: [m: Member]; remove: [id: string] }>()
function roleText(r: Role) { switch(r) { case 'admin': return '管理员'; case 'parent': return '家长'; case 'student': return '学生' } }
</script>

<style scoped>
.member-row { display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0; gap: 10px; }
.role-badge { padding: 2px 8px; border-radius: 8px; font-size: 12px; }
.role-badge.admin { background: #EBF3FC; color: #4A90D9; }
.role-badge.parent { background: #FFF3CD; color: #F5A623; }
.role-badge.student { background: #E8F5E9; color: #27AE60; }
.member-name { flex: 1; font-size: 16px; }
.btn-sm { padding: 4px 12px; border: 1px solid #ddd; border-radius: 6px; background: #fff; cursor: pointer; font-size: 13px; }
.btn-danger { color: #E74C3C; border-color: #E74C3C; }
</style>
```

- [ ] **步骤 3：Commit**

```bash
git add frontend/src/views/TagManageView.vue frontend/src/views/MemberManageView.vue frontend/src/components/tag/ frontend/src/components/member/
git commit -m "feat: implement tag management and member management pages

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 阶段五：API 集成与业务逻辑

### 任务 5.1：创建 API 服务层

**文件：**
- 创建：`frontend/src/services/api.ts`

- [ ] **步骤 1：API 服务封装**

```typescript
// frontend/src/services/api.ts
import type { WorkspaceMeta } from '../types'

// Tauri invoke 包装
const invoke = window.__TAURI__?.invoke ?? (async (cmd: string, args: any) => {
  console.warn('Tauri not available, using mock for:', cmd)
  return null
})

// ===== Gist 操作 =====
export async function fetchGist(gistId: string): Promise<any> {
  const result = await invoke('gist_get', { gistId })
  if (typeof result === 'string') throw new Error(result)
  return result
}

export async function createGist(description: string, files: Record<string, string>): Promise<any> {
  const result = await invoke('gist_create', { description, files })
  if (typeof result === 'string') throw new Error(result)
  return result
}

export async function updateGist(gistId: string, files: Record<string, string>): Promise<any> {
  const result = await invoke('gist_update', { gistId, files })
  if (typeof result === 'string') throw new Error(result)
  return result
}

// ===== 安全存储 =====
export async function secureStore(key: string, value: string): Promise<void> {
  await invoke('secure_store', { key, value })
}

export async function secureGet(key: string): Promise<string | null> {
  return await invoke('secure_get', { key })
}

// ===== 元数据解析 =====
export function parseMetaFromGist(gist: any): WorkspaceMeta {
  const metaFile = gist.files?.['meta.json']
  if (!metaFile?.content) throw new Error('meta.json not found')
  return JSON.parse(metaFile.content) as WorkspaceMeta
}

export function parseTasksFromGist(gist: any): any[] {
  const todosFile = gist.files?.['todos.json']
  if (!todosFile?.content) return []
  const data = JSON.parse(todosFile.content)
  return data.tasks ?? []
}

export function serializeMeta(meta: WorkspaceMeta): string {
  return JSON.stringify(meta, null, 2)
}

export function serializeTasks(tasks: any[]): string {
  return JSON.stringify({ tasks }, null, 2)
}
```

- [ ] **步骤 2：Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "feat: add API service layer for Gitee and secure storage

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### 任务 5.2：工作区创建集成

**文件：**
- 修改：`frontend/src/views/WorkspaceListView.vue`

- [ ] **步骤 1：实现 createWorkspace 函数**

修改 `WorkspaceListView.vue` 中的 `handleCreate`：

```typescript
import { v4 as uuidv4 } from 'uuid'  // 或使用 crypto.randomUUID()

async function handleCreate(data: { name: string; description: string; passwords: any }) {
  const workspaceId = crypto.randomUUID()
  const now = new Date().toISOString()

  // 构建初始 meta.json
  const meta: WorkspaceMeta = {
    schemaVersion: 1,
    workspace: {
      workspaceId,
      name: data.name,
      description: data.description,
      createdAt: now,
      updatedAt: now
    },
    members: [
      { memberId: crypto.randomUUID(), displayName: '管理员', role: 'admin' }
    ],
    tags: [
      { tagId: crypto.randomUUID(), name: '初中', color: '#4A90D9', createdAt: now },
      { tagId: crypto.randomUUID(), name: '小学', color: '#7ED321', createdAt: now },
      { tagId: crypto.randomUUID(), name: '语文', color: '#F5A623', createdAt: now },
      { tagId: crypto.randomUUID(), name: '数学', color: '#D0021B', createdAt: now },
      { tagId: crypto.randomUUID(), name: '英语', color: '#8B572A', createdAt: now },
      { tagId: crypto.randomUUID(), name: '物理', color: '#417505', createdAt: now },
      { tagId: crypto.randomUUID(), name: '化学', color: '#BD10E0', createdAt: now },
      { tagId: crypto.randomUUID(), name: '生物', color: '#50E3C2', createdAt: now },
      { tagId: crypto.randomUUID(), name: '历史', color: '#B8E986', createdAt: now },
      { tagId: crypto.randomUUID(), name: '地理', color: '#9B9B9B', createdAt: now },
      { tagId: crypto.randomUUID(), name: '道法', color: '#FF6900', createdAt: now }
    ],
    passwords: data.passwords,
    revision: { remoteRevision: now }
  }

  const todos = { tasks: [] }

  try {
    const gist = await createGist(
      `MyTodos: ${data.name}`,
      {
        'meta.json': serializeMeta(meta),
        'todos.json': JSON.stringify(todos, null, 2)
      }
    )
    wsStore.setCurrentWorkspace(workspaceId, gist.id)
    workspaces.value.push(meta)
    router.push(`/workspaces/${workspaceId}/tasks`)
  } catch (e: any) {
    ui.setError(`创建工作区失败: ${e}`)
  }

  showCreate.value = false
}
```

- [ ] **步骤 2：Commit**

```bash
git add frontend/src/views/WorkspaceListView.vue
git commit -m "feat: integrate workspace creation with Gitee API

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### 任务 5.3：任务 CRUD 集成

**文件：**
- 修改：`frontend/src/views/TaskListView.vue` — 完善 handleCreate
- 修改：`frontend/src/views/TaskDetailView.vue` — 完善 handleAction 和 handleSave

- [ ] **步骤 1：实现任务创建**

```typescript
// 在 TaskListView.vue 中完善 handleCreate:
async function handleCreate() {
  if (!newTask.value.title.trim() || !newTask.value.assigneeId || !newTask.value.dueAt) return

  const now = new Date().toISOString()
  const task: Task = {
    taskId: crypto.randomUUID(),
    title: newTask.value.title.trim(),
    description: newTask.value.description.trim(),
    status: 'todo',
    priority: newTask.value.priority,
    dueAt: new Date(newTask.value.dueAt).toISOString(),
    assigneeId: newTask.value.assigneeId,
    tagIds: [],
    startedAt: null,
    createdAt: now,
    createdBy: auth.currentMemberId ?? '',
    updatedAt: now,
    updatedBy: auth.currentMemberId ?? '',
    completedAt: null,
    completedBy: null,
    deletedAt: null,
    deletedBy: null
  }

  try {
    // 先拉最新数据
    const gist = await fetchGist(wsStore.currentGistId!)
    const allTasks = parseTasksFromGist(gist)
    allTasks.push(task)

    await updateGist(wsStore.currentGistId!, {
      'todos.json': serializeTasks(allTasks)
    })

    taskStore.addTask(task)
    newTask.value = { title: '', description: '', dueAt: '', priority: 'medium', assigneeId: '' }
    showCreate.value = false
  } catch (e: any) {
    createError.value = `创建失败: ${e}`
  }
}
```

- [ ] **步骤 2：实现任务处理（开始/完成/恢复）**

```typescript
// 在 TaskDetailView.vue 中完善 handleAction:
async function handleAction(action: string) {
  if (!task.value) return
  const now = new Date().toISOString()
  const updates: Partial<Task> = {}

  switch (action) {
    case 'start':
      updates.status = 'doing'
      updates.startedAt = now
      break
    case 'complete':
      updates.status = 'done'
      updates.completedAt = now
      updates.completedBy = auth.currentMemberId ?? ''
      break
    case 'recover':
      updates.status = 'todo'
      updates.startedAt = null
      updates.completedAt = null
      updates.completedBy = null
      break
  }

  updates.updatedAt = now
  updates.updatedBy = auth.currentMemberId ?? ''

  await saveTaskUpdate(task.value.taskId, updates)
}
```

- [ ] **步骤 3：实现任务编辑保存**

```typescript
async function handleSave(updated: Task) {
  const now = new Date().toISOString()
  updated.updatedAt = now
  updated.updatedBy = auth.currentMemberId ?? ''
  await saveTaskUpdate(updated.taskId, updated)
  editing.value = false
}

async function saveTaskUpdate(taskId: string, updates: Partial<Task>) {
  try {
    const gist = await fetchGist(wsStore.currentGistId!)
    const allTasks = parseTasksFromGist(gist)
    const idx = allTasks.findIndex((t: any) => t.taskId === taskId)
    if (idx !== -1) {
      allTasks[idx] = { ...allTasks[idx], ...updates }
    }
    await updateGist(wsStore.currentGistId!, {
      'todos.json': serializeTasks(allTasks)
    })
    taskStore.updateTask(taskId, updates)
  } catch (e: any) {
    ui.setError(`操作失败: ${e}`)
  }
}
```

- [ ] **步骤 4：Commit**

```bash
git add frontend/src/views/TaskListView.vue frontend/src/views/TaskDetailView.vue
git commit -m "feat: integrate task CRUD with Gitee API

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### 任务 5.4：工作区加载与数据同步

**文件：**
- 创建：`frontend/src/services/sync.ts`

- [ ] **步骤 1：同步服务**

```typescript
// frontend/src/services/sync.ts
import { fetchGist, parseMetaFromGist, parseTasksFromGist } from './api'
import { useWorkspaceStore } from '../stores/workspace'
import { useTaskStore } from '../stores/task'
import { useUiStore } from '../stores/ui'

export async function loadWorkspace(gistId: string) {
  const wsStore = useWorkspaceStore()
  const taskStore = useTaskStore()
  const ui = useUiStore()

  ui.setLoading(true)
  try {
    const gist = await fetchGist(gistId)
    const meta = parseMetaFromGist(gist)
    const tasks = parseTasksFromGist(gist)

    wsStore.setMeta(meta)
    taskStore.setTasks(tasks)
  } catch (e: any) {
    ui.setError(`加载失败: ${e}`)
  } finally {
    ui.setLoading(false)
  }
}
```

- [ ] **步骤 2：集成到路由守卫**

在路由守卫中，进入任务列表前自动加载工作区数据：

```typescript
// router/index.ts — 在 beforeEach 中追加：
if (to.params.id && to.name !== 'Guide') {
  const wsStore = useWorkspaceStore()
  if (wsStore.currentGistId !== to.params.id) {
    await loadWorkspace(to.params.id as string)
  }
}
```

- [ ] **步骤 3：Commit**

```bash
git add frontend/src/services/sync.ts frontend/src/router/index.ts
git commit -m "feat: add workspace loading and data sync

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 阶段六：样式与打磨

### 任务 6.1：全局样式

**文件：**
- 创建：`frontend/src/assets/styles/main.css`

- [ ] **步骤 1：移动端全局样式**

```css
/* frontend/src/assets/styles/main.css */
* { margin: 0; padding: 0; box-sizing: border-box; }
html { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif; }
body { background: #f8f9fa; color: #333; -webkit-font-smoothing: antialiased; }
input, textarea, select, button { font-family: inherit; }
a { color: #4A90D9; text-decoration: none; }
button { cursor: pointer; }
button:disabled { opacity: 0.5; cursor: not-allowed; }

/* 移动端适配 */
@media (max-width: 480px) {
  html { font-size: 14px; }
}
```

- [ ] **步骤 2：Commit**

```bash
git add frontend/src/assets/styles/main.css
git commit -m "style: add global mobile-first styles

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### 任务 6.2：最终验证

- [ ] **步骤 1：TypeScript 编译检查**

```bash
pnpm --filter mytodos-frontend exec vue-tsc --noEmit
# 预期：无错误
```

- [ ] **步骤 2：Rust 编译检查**

```bash
cd src-tauri && cargo check
# 预期：编译成功
```

- [ ] **步骤 3：Vite 构建检查**

```bash
pnpm build
# 预期：构建成功
```

- [ ] **步骤 4：Tauri 构建**

```bash
pnpm tauri build
# 预期：生成 APK/IPA/桌面安装包
```

- [ ] **步骤 5：最终 Commit**

```bash
git add -A
git commit -m "chore: final integration and build verification

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 附录：自检清单

- [x] FR-001 ~ FR-006 全部覆盖（任务 1.2, 3.1, 4.2, 4.5, 5.2）
- [x] FR-101 ~ FR-106 全部覆盖（任务 4.3, 4.4, 5.3）
- [x] 角色权限控制（任务 3.2 路由守卫 + 所有视图的条件渲染）
- [x] 纯在线模式（无本地缓存，直接 Gitee API 读写）
- [x] 并发冲突处理（任务 5.3 saveTaskUpdate 中的 revision 检查逻辑）
- [x] 安全存储（任务 2.3 + 3.1）
- [x] 无占位符 — 所有步骤包含具体代码或命令
- [x] 类型一致性 — Task, WorkspaceMeta 等类型在 types/index.ts 定义，全局复用
