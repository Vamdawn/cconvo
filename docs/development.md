[English](./development.md) | [中文](./development.zh-CN.md)

# Development Guide

## Install from Source

```bash
# Clone the repository
git clone https://github.com/Vamdawn/cconvo.git
cd cconvo

# Install dependencies
pnpm install

# Build
pnpm build

# Global install
pnpm link --global
```

## Development Mode

```bash
pnpm dev              # Interactive mode
pnpm dev list         # List conversations
pnpm dev export <id>  # Export conversation
```

## Project Structure

```
cconvo/
├── src/
│   ├── index.ts              # Entry point
│   ├── cli.ts                # CLI command definitions
│   ├── interactive.ts        # Interactive interface
│   ├── completion.ts         # Shell completion script generation
│   ├── core/
│   │   ├── scanner.ts        # Scan conversation directories
│   │   └── parser.ts         # Parse JSONL files
│   ├── models/
│   │   └── types.ts          # TypeScript type definitions
│   ├── exporters/
│   │   ├── markdown.ts       # Markdown export
│   │   ├── json.ts           # JSON export
│   │   └── html.ts           # HTML export
│   └── utils/
│       ├── path.ts           # Path utilities
│       ├── format.ts         # Formatting utilities
│       └── shell.ts          # Shell detection and completion install
├── scripts/
│   └── postinstall.js        # Post-install prompt script
├── package.json
└── tsconfig.json
```

## Tech Stack

- TypeScript
- Commander.js - CLI framework
- Inquirer.js - Interactive prompts
- Chalk - Terminal colors
- Ora - Loading animations

## Manual Shell Completion Installation

If automatic installation doesn't work, you can configure manually:

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
