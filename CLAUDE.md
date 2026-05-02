# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**MyTodos** — 面向 2-5 人小团队的跨端待办协作应用。技术栈：Rust + Tauri 2 + Vue 3 + TypeScript。**无自建后端**，所有团队数据以 JSON 形式存储在 Gitee 代码片段（Gist）中，客户端通过 PAT 直接调用 Gitee API v5 完成读写，必须联网使用。目标端为移动端（Android/iOS）优先，桌面端（Windows/macOS/Linux）共用同一份代码。

## 仓库结构（Monorepo）

```
frontend/            Vue 3 + Vite 前端（pnpm workspace 包名 mytodos-frontend）
backend/src-tauri/   Rust + Tauri 应用外壳（crate 名 mytodos / lib 名 mytodos_lib）
doc/                 1-SRS需求.md、2-PRD设计.md、3-TEST测试用例.md（变更需求时必先改这三份）
scripts/             分平台的安装/构建脚本：windows/ (PowerShell)、macos/、linux/、android-permission-sign/
config/              Android 签名密钥（keystore.properties、release.keystore）
```

pnpm workspace 仅纳管 `frontend/`，根 `package.json` 的脚本通过 `pnpm --filter mytodos-frontend` 转发到前端包。

## 常用命令

根目录（推荐入口）：
- `pnpm dev` — 启动 Tauri 桌面端开发模式（会自动 `pnpm start` 起前端 devServer 在 1420 端口）
- `pnpm start` — 仅启动前端 Vite devServer（http://localhost:1420）
- `pnpm build` — 仅构建前端产物（`frontend/dist`），含 `vue-tsc --noEmit` 类型检查
- `pnpm tauri <cmd>` — 透传 Tauri CLI（如 `pnpm tauri build`、`pnpm tauri android init` 等）

前端单独操作：进入 `frontend/` 后用 `pnpm dev|build|preview`。

平台构建脚本（一键）：
- Windows：`scripts/windows/build_windows_bywin.ps1`、`build_android_bywin.ps1`，环境安装见 `install_*_bywin.ps1`
- macOS：`scripts/macos/build_macos.sh`，环境安装见 `install_*_macos.sh`
- Linux：`scripts/linux/build_bylinux.sh`

无配置好的测试框架；测试规格记录在 `doc/3-TEST测试用例.md`，目前以手工/文档化用例为主。

## 架构要点

### 前端（frontend/src）
- 入口：`main.ts` → `App.vue`（仅 `<router-view/>`），路由集中于 `router/index.ts`。
- 视图：`views/` 下 `GuideView`、`WorkspaceListView`、`TaskListView`、`TaskDetailView`、`TagManageView`、`MemberManageView`。
- 组件按领域分目录：`components/{common,guide,task,tag,member,workspace}/`。
- 状态管理：Pinia，`stores/` 下 `auth`、`workspace`、`task`、`tag`、`ui` 五个 store。
- 数据访问层：
  - `services/api.ts` — 封装 Gitee Gist API 调用（通过 Tauri `invoke` 走 Rust 端发请求，绕开 CORS 与隐藏 PAT）。
  - `services/sync.ts` — 工作区数据集的拉取/写回逻辑。
- 类型集中在 `types/index.ts`；通用工具：`utils/{date,filter,search,sort}.ts`。

### 后端（backend/src-tauri/src）
Rust 端只承担两类职责，没有业务存储：
- `commands/gist.rs` — `gist_get` / `gist_create` / `gist_update`，使用 `reqwest` 直连 Gitee 代码片段 API。
- `commands/secure_store.rs` — `secure_store` / `secure_get` / `secure_remove`，本地安全存储 PAT 等敏感凭据。
- `lib.rs` 通过 `invoke_handler!` 注册命令；`main.rs` 调用 `mytodos_lib::run()`。
- `config.rs` + `dotenvy` 读取本地配置；HTTP 走 `rustls-tls`（不依赖 OpenSSL）。

### 数据流
Vue 组件 → Pinia store → `services/api.ts` → Tauri `invoke` → Rust `commands::gist` → Gitee Gist API。所有团队/任务/标签数据序列化为 JSON 存放于 Gist；不做本地缓存与离线队列。

## 开发约束（项目级）

### 会话开始流程
进入会话先执行 `git status --short`；若有改动：
1. `git add -A` 暂存
2. `git diff --cached --stat` 看摘要
3. 用中文按 Conventional Commits 提交（`feat|fix|refactor|docs|style|chore: 描述`）
4. `git push` 推送

### 变更需求流程（强约束）
**必须先改文档再改代码**，按顺序更新：
1. `doc/1-SRS需求.md`
2. `doc/2-PRD设计.md`
3. `doc/3-TEST测试用例.md`

随后代码改动需对齐文档。

### 平台与 Shell
开发主机为 Windows 11，但 Claude Code 内运行的是 bash —— 路径用正斜杠、空设备用 `/dev/null`，不要用 `NUL` 或 PowerShell 语法。涉及 Windows 一键脚本时再使用 `scripts/windows/*.ps1`。
