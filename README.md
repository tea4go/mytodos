# MyTodos — 团队待办协作 App

在 MyTodos 中捕捉所有任务，感受有序带来的掌控力。

MyTodos 是一个面向 **2-5 人小团队**（如家庭场景）的待办事项协作应用。无需自建后端，所有数据通过 **Gitee 代码片段（Gist）API** 存储，开箱即用。

## 截图预览

> （待补充）

## 核心功能

### 三角色权限体系

| 角色 | 职责 | 能力 |
|------|------|------|
| **管理员** | 工作区配置、成员管理、标签管理 | 创建/编辑工作区、管理成员、管理标签（不可操作任务） |
| **家长** | 任务全生命周期管理 | 创建/编辑/删除/恢复任务、搜索筛选 |
| **学生** | 任务执行 | 查看指派给自己的任务、标记进行中/完成/恢复待办 |

### 任务管理

- 支持标题、详情描述、优先级（低/中/高）、截止日期、指派人、标签
- 状态流转：待办 → 进行中 → 已完成（支持恢复待办）
- 丰富的筛选：按状态、指派人、截止日期、标签
- 关键词搜索（标题 + 描述）
- 记录任务开始时间与完成时间，自动计算耗时

### 特色设计

- **Gitee Gist 存储**：零后端依赖，所有数据以 JSON 形式存储于 Gitee 代码片段
- **全局配置共享**：所有终端共享同一份全局配置与任务数据
- **自动升级**：支持版本检查与在线下载安装包（推荐升级 / 强制升级）
- **跨平台**：一套代码编译 Android、iOS、Windows、macOS、Linux

## 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 前端框架 | **Vue 3** + Composition API | 响应式 UI |
| 状态管理 | **Pinia** | 工作区、任务、用户状态 |
| 路由 | **Vue Router 4** | 页面导航与角色守卫 |
| 桌面壳 | **Tauri 2** | Rust 后端 + WebView |
| HTTP 客户端 | **reqwest** + rustls-tls | Rust 端直连 Gitee API |
| 安全存储 | Tauri Plugin (keyring/secure-store) | PAT、成员密码加密存储 |
| 构建 | **Vite** | 前端打包 |
| 包管理 | **pnpm** | 依赖管理 |

## 项目结构

```
mytodos/
├── frontend/                  # Vue 3 前端
│   └── src/
│       ├── views/             # 页面组件
│       ├── components/        # 通用/业务组件
│       ├── stores/            # Pinia 状态管理（auth/workspace/task/tag/release/ui）
│       ├── services/          # API 服务层（api/sync/release）
│       ├── router/            # 路由配置
│       ├── utils/             # 工具函数（sort/filter/search/semver/date）
│       └── types/             # TypeScript 类型定义
├── backend/
│   └── src-tauri/             # Rust 后端
│       └── src/
│           ├── commands/      # Tauri 命令
│           │   ├── gist.rs        # Gitee Gist API 操作
│           │   ├── secure_store.rs# 系统安全存储
│           │   └── release.rs     # 升级下载与安装
│           └── config.rs      # 环境变量配置
├── patches/                   # Android 兼容性补丁（tao + wry）
├── scripts/                   # 构建与部署脚本
│   ├── windows/               # Windows 构建脚本（PowerShell）
│   ├── macos/                 # macOS 构建脚本
│   └── linux/                 # Linux 构建脚本
├── doc/                       # 设计文档
│   ├── 0-Prompt提示词.md
│   ├── 1-SRS需求.md           # 需求规格说明书
│   ├── 2-PRD设计.md           # 产品设计文档
│   └── 3-TEST测试用例.md      # 测试用例
└── package.json               # 项目根配置
```

## 快速开始

### 前置依赖

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 10
- [Rust](https://www.rust-lang.org/) >= 1.77
- [Tauri 2 系统依赖](https://v2.tauri.app/start/prerequisites/)

### 配置

1. 克隆项目并安装依赖：

```bash
pnpm install
```

2. 配置 Gitee 凭证：

```bash
# 后端 PAT（编译时注入）
echo "GITEE_PAT=your_personal_access_token" > backend/src-tauri/.env

# 前端全局配置 gistId（编译时注入）
echo "VITE_GLOBAL_GIST_ID=your_gist_id" > frontend/.env
```

### 开发

```bash
# 开发模式（桌面端）
pnpm dev

# 仅启动前端（浏览器预览）
pnpm start
```

### 构建

```bash
# Android
pnpm tauri android build --apk --debug

# iOS
pnpm tauri ios build --debug

# 桌面端
pnpm tauri build
```

> 详细平台构建脚本见 `scripts/` 目录（Windows 使用 PowerShell，macOS/Linux 使用 Shell 脚本）。

## 平台支持

| 平台 | 状态 | 最低版本 |
|------|------|----------|
| Android | ✅ 已适配 | API 24（Android 7.0） |
| iOS | ✅ 已适配 | - |
| Windows | ✅ 支持 | - |
| macOS | ✅ 支持 | - |
| Linux | ✅ 支持 | - |

> Android 端通过 Cargo patch 机制修补了 `tao` 和 `wry` 库的 `getId()` API 兼容性问题，确保 Android 7.0~8.1（API 24~27）设备正常运行。

## 数据架构

所有数据存储在 Gitee 代码片段中，分为两类：

- **全局配置 gist**：存储工作区列表、全局成员列表、全局标签、应用版本信息（`global.json`）
- **工作区任务 gist**：每个工作区独立存储其任务数据（`todos.json`）

数据格式使用 JSON，支持 schema 版本迁移与乐观并发控制。

## 路由一览

| 路径 | 页面 | 角色 |
|------|------|------|
| `/guide` | 首次进入引导 | 任意（首启） |
| `/workspaces` | 工作区列表 | 所有角色 |
| `/login` | 登录页 | 任意（未登录） |
| `/workspaces/:id/tasks` | 任务列表 | 家长、学生 |
| `/workspaces/:id/tasks/:taskId` | 任务详情 | 所有角色 |
| `/workspaces/:id/tags` | 标签管理 | 管理员 |
| `/workspaces/:id/members` | 成员管理 | 管理员 |
| `/workspaces/:id/settings` | 工作区设置 | 管理员 |
| `/workspaces/:id/admin` | 管理员主页 | 管理员 |

## 许可证

本项目仅供学习与交流使用。
