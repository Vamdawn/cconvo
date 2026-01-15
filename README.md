# CConvo

交互式 CLI 工具，用于浏览和导出 Claude Code 本地保存的对话记录。

## 功能特性

- 扫描并列出所有项目和对话
- 支持导出为 Markdown、JSON、HTML 格式
- 交互式菜单界面，支持项目浏览和搜索
- 统计视图，显示 Token 使用量和文件大小
- 支持子代理 (subagent) 对话

## 安装

### npm 全局安装（推荐）

```bash
npm install -g @vamdawn/cconvo
```

安装后启用 Shell 补全：

```bash
cconvo completion:setup
```

### 从源码安装

```bash
# 克隆仓库
git clone https://github.com/Vamdawn/cconvo.git
cd cconvo

# 安装依赖
pnpm install

# 构建
pnpm build

# 全局安装
pnpm link --global
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

### 开发模式

```bash
pnpm dev              # 交互式模式
pnpm dev list         # 列出对话
pnpm dev export <id>  # 导出对话
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

## 项目结构

```
cconvo/
├── src/
│   ├── index.ts              # 入口文件
│   ├── cli.ts                # CLI 命令定义
│   ├── interactive.ts        # 交互式界面
│   ├── completion.ts         # Shell 补全脚本生成
│   ├── core/
│   │   ├── scanner.ts        # 扫描对话目录
│   │   └── parser.ts         # 解析 JSONL 文件
│   ├── models/
│   │   └── types.ts          # TypeScript 类型定义
│   ├── exporters/
│   │   ├── markdown.ts       # Markdown 导出
│   │   ├── json.ts           # JSON 导出
│   │   └── html.ts           # HTML 导出
│   └── utils/
│       ├── path.ts           # 路径工具
│       ├── format.ts         # 格式化工具
│       └── shell.ts          # Shell 检测和补全安装
├── scripts/
│   └── postinstall.js        # 安装后提示脚本
├── package.json
└── tsconfig.json
```

## Shell 补全

### 自动安装（推荐）

```bash
cconvo completion:setup
```

### 手动安装

**Bash**
```bash
cconvo completion bash >> ~/.bashrc
source ~/.bashrc
```

**Zsh**
```bash
cconvo completion zsh >> ~/.zshrc
source ~/.zshrc
```

**Fish**
```bash
mkdir -p ~/.config/fish/completions
cconvo completion fish > ~/.config/fish/completions/cconvo.fish
```

### 卸载补全

```bash
cconvo completion:uninstall
```

## 技术栈

- TypeScript
- Commander.js - CLI 框架
- Inquirer.js - 交互式提示
- Chalk - 终端颜色
- Ora - 加载动画

## License

MIT
