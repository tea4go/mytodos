# CLAUDE.md

## 会话开始时

检查当前仓库是否有未提交的改动（unstaged 或 staged）：

```
git status --short
```

如果有任何改动：
1. 执行 `git add -A` 暂存所有改动
2. 执行 `git diff --cached --stat` 查看改动摘要
3. 根据改动内容，用中文生成规范的提交消息并提交
4. 提交消息格式遵循 Conventional Commits：
   - `feat: 描述` — 新功能
   - `fix: 描述` — 修复bug
   - `refactor: 描述` — 重构
   - `docs: 描述` — 文档
   - `style: 描述` — 格式调整
   - `chore: 描述` — 杂项
5. 提交后执行 `git push` 推送到远程仓库

## 变更需求
必须先修改文档再修改代码

更新到以下文档：
1、1-SRS需求.md
2、2-PRD设计.md
3、3-TEST测试用例.md

修改代码需要根据文档进行修改
