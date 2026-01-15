# 开发指南

## 从源码安装

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

## 开发模式

```bash
pnpm dev              # 交互式模式
pnpm dev list         # 列出对话
pnpm dev export <id>  # 导出对话
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

## 技术栈

- TypeScript
- Commander.js - CLI 框架
- Inquirer.js - 交互式提示
- Chalk - 终端颜色
- Ora - 加载动画

## Shell 补全手动安装

如果自动安装不适用，可以手动配置：

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
