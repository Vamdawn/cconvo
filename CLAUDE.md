# cconvo 开发规范

## 开发环境

- Node.js >= 18.0.0
- pnpm

## 代码规范

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `path-utils.ts` |
| 函数 | camelCase | `scanProjects()` |
| 常量 | UPPER_SNAKE_CASE | `PROJECTS_DIR` |
| 类型/接口 | PascalCase | `MessageRecord` |

### TypeScript 规范

- 严格模式 (`strict: true`)
- ES Module，导入使用 `.js` 后缀
- 类型导入使用 `import type`
- 避免使用 `any`，必要时使用 `unknown`

### 注释规范

- 使用中文注释
- 简洁明了，放在代码上方

### 导入顺序

1. Node.js 内置模块
2. 第三方库
3. 本地模块（类型导入优先）

## Git 提交规范

格式: `<emoji> <type>: <description>`

| Emoji | Type | 描述 |
|-------|------|------|
| ✨ | feat | 新功能 |
| 🐛 | fix | Bug 修复 |
| 📝 | docs | 文档更新 |
| ♻️ | refactor | 代码重构 |
| ⚡️ | perf | 性能优化 |
| 🔧 | config | 配置修改 |
| ⬆️ | deps | 依赖更新 |

**注意**: 当本次 commit 提交内容符合 CHANGELOG 记录要求时，需同步更新 `[Unreleased]` 部分。

## CHANGELOG 维护规范

基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 和[语义化版本](https://semver.org/lang/zh-CN/)。

### 核心原则

- CHANGELOG 是给**人**看的，便于快速了解版本变化
- 最新版本在最前面，按时间倒序排列
- 每个版本包含发布日期 (YYYY-MM-DD 格式)

### 变更分类

按以下顺序组织，仅包含实际存在的分类：

| 分类 | 说明 | 对应 Commit |
|------|------|-------------|
| Added | 新增功能 | ✨ feat |
| Changed | 现有功能变更 | ♻️ refactor, ⚡️ perf |
| Deprecated | 即将废弃的功能 | - |
| Removed | 已移除的功能 | - |
| Fixed | Bug 修复 | 🐛 fix |
| Security | 安全漏洞修复 | 🔒 security |

### 更新流程

1. **开发时**: 每次提交后，在 `[Unreleased]` 对应分类下添加记录
2. **发布时**:
   - 将 `[Unreleased]` 内容移至新版本号 `[x.y.z] - YYYY-MM-DD`
   - 创建新的空 `[Unreleased]` 章节
   - 打 git 标签 `vx.y.z`

### 格式示例

```markdown
## [Unreleased]

### Added
- ✨ 新增 XXX 功能

## [1.0.0] - 2025-01-15

### Added
- ✨ 新增 YYY 功能

### Fixed
- 🐛 修复 ZZZ 问题
```
