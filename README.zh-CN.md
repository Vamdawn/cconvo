[English](./README.md) | [中文](./README.zh-CN.md)

# CConvo

交互式 CLI 工具，用于浏览和导出 Claude Code 本地保存的对话记录。

## 功能特性

- 扫描并列出所有项目和对话
- 支持导出为 Markdown、JSON、HTML 格式
- 交互式菜单界面，支持项目浏览和搜索
- 统计视图，显示 Token 使用量和文件大小
- 支持子代理 (subagent) 对话

## 安装

```bash
npm install -g @vamdawn/cconvo
```

安装后启用 Shell 补全：

```bash
cconvo completion:setup
```

## 使用方法

### 交互式模式

```bash
cconvo
```

进入交互式界面，可以：
- 浏览项目列表
- 搜索对话
- 预览对话内容
- 选择导出格式和选项

### 命令行模式

```bash
# 列出所有项目和对话
cconvo list

# 按项目名筛选
cconvo list --project "my-project"

# 导出对话为 Markdown
cconvo export <session-id> -o output.md

# 导出为 HTML
cconvo export <session-id> --format html -o output.html

# 导出为 JSON
cconvo export <session-id> --format json -o output.json

# 导出选项
cconvo export <session-id> -o output.md \
  --no-thinking      # 不包含思考过程
  --no-tools         # 不包含工具调用
  --subagents        # 包含子代理对话

# 查看统计信息
cconvo stats
cconvo stats --project "my-project"
```

## 导出格式

| 格式 | 说明 |
|------|------|
| Markdown | 适合阅读和二次编辑，支持折叠显示思考过程和工具调用 |
| JSON | 完整数据导出，保留所有元信息 |
| HTML | 带暗色主题样式的可视化页面，支持交互式展开/折叠 |

## 数据源

工具读取 `~/.claude/projects` 目录下的对话数据：

```
~/.claude/
├── history.jsonl                    # 全局对话历史
└── projects/
    └── -Users-xxx-Repository-xxx/   # 项目目录
        ├── {sessionId}.jsonl        # 主对话文件
        └── {sessionId}/
            └── subagents/
                └── agent-{id}.jsonl # 子代理对话
```

## Shell 补全

```bash
# 安装补全
cconvo completion:setup

# 卸载补全
cconvo completion:uninstall
```

## 开发

查看 [开发指南](docs/development.zh-CN.md)

## License

MIT
