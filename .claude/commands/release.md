# Claude Command: Release

自动化版本发布流程，基于变更内容更新版本号、CHANGELOG，提交并打标签。

## Usage

```
/release              # 自动推断版本类型
/release --patch      # 强制 patch 版本
/release --minor      # 强制 minor 版本
/release --major      # 强制 major 版本
/release --publish    # 发布后推送到 npm
```

## 发布流程

### 1. 检查工作区状态

运行 `git status` 确保：
- 工作区干净，或
- 只有待发布的变更（package.json、CHANGELOG.md）

如果有未提交的代码变更，提示用户先提交或 stash。

### 2. 读取当前状态

- 读取 `package.json` 获取当前版本号
- 读取 `CHANGELOG.md` 的 `[Unreleased]` 部分

### 3. 确定版本类型

如果用户指定了 `--major`/`--minor`/`--patch`，使用指定的类型。

否则，根据 CHANGELOG [Unreleased] 内容自动推断：

| 分类 | 版本类型 |
|------|---------|
| 包含 "Breaking" 或 "Removed" | major |
| 包含 "Added" 或 "Changed" | minor |
| 只有 "Fixed"/"Security"/"Deprecated" | patch |
| [Unreleased] 为空 | 中止发布，提示无变更 |

### 4. 更新版本号

计算新版本号（当前版本 + 版本类型增量）。

更新 `package.json` 中的 `version` 字段。

### 5. 更新 CHANGELOG

将 `[Unreleased]` 内容移至新版本号章节：

```markdown
## [Unreleased]

## [X.Y.Z] - YYYY-MM-DD

### Added
- ...
```

日期使用当天日期，格式 YYYY-MM-DD。

### 6. 显示变更预览

向用户展示：
- 版本变更：`1.0.0` → `1.1.0`
- CHANGELOG 更新内容
- 即将执行的操作

询问用户确认后继续。

### 7. 提交变更

```bash
git add package.json CHANGELOG.md
git commit -m "🔖 chore: release vX.Y.Z"
```

### 8. 创建 Git 标签

```bash
git tag vX.Y.Z
```

### 9. 构建项目

```bash
pnpm build
```

确保构建成功。

### 10. 发布到 npm（可选）

只有在用户指定 `--publish` 时执行：

```bash
pnpm publish
```

### 11. 完成提示

显示发布摘要：
- 新版本号
- Git 标签
- 后续操作建议（如 `git push && git push --tags`）

## 注意事项

- 发布前确保所有测试通过
- 不自动推送到远程，让用户决定
- 如果发布失败，提供回滚指南
- 遵循项目的 CHANGELOG 维护规范
