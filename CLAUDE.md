# cc-exporter 开发规范

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

## CHANGELOG 更新流程

每次功能变更后:
1. 在 `CHANGELOG.md` 的 `[Unreleased]` 部分添加记录
2. 发布版本时，将内容移至新版本号下并添加日期
