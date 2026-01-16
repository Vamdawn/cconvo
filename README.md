[English](./README.md) | [中文](./README.zh-CN.md)

# CConvo

An interactive CLI tool for browsing and exporting locally saved Claude Code conversations.

## Features

- Scan and list all projects and conversations
- Export to Markdown, JSON, or HTML formats
- Interactive menu interface with project browsing and search
- Statistics view showing token usage and file sizes
- Support for subagent conversations

## Installation

```bash
npm install -g @vamdawn/cconvo
```

After installation, enable shell completion:

```bash
cconvo completion:setup
```

## Usage

### Interactive Mode

```bash
cconvo
```

Enter the interactive interface to:
- Browse project list
- Search conversations
- Preview conversation content
- Select export format and options

### Command Line Mode

```bash
# List all projects and conversations
cconvo list

# Filter by project name
cconvo list --project "my-project"

# Export conversation to Markdown
cconvo export <session-id> -o output.md

# Export to HTML
cconvo export <session-id> --format html -o output.html

# Export to JSON
cconvo export <session-id> --format json -o output.json

# Export options
cconvo export <session-id> -o output.md \
  --no-thinking      # Exclude thinking process
  --no-tools         # Exclude tool calls
  --subagents        # Include subagent conversations

# View statistics
cconvo stats
cconvo stats --project "my-project"
```

## Export Formats

| Format | Description |
|--------|-------------|
| Markdown | Suitable for reading and editing, supports collapsible thinking process and tool calls |
| JSON | Complete data export, preserves all metadata |
| HTML | Visualized page with dark theme, supports interactive expand/collapse |

## Data Source

The tool reads conversation data from the `~/.claude/projects` directory:

```
~/.claude/
├── history.jsonl                    # Global conversation history
└── projects/
    └── -Users-xxx-Repository-xxx/   # Project directory
        ├── {sessionId}.jsonl        # Main conversation file
        └── {sessionId}/
            └── subagents/
                └── agent-{id}.jsonl # Subagent conversation
```

## Shell Completion

```bash
# Install completion
cconvo completion:setup

# Uninstall completion
cconvo completion:uninstall
```

## Development

See [Development Guide](docs/development.md)

## License

MIT
