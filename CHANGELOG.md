# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- ✨ `export` command now supports partial session ID prefix matching (similar to git commit short hash)
  - Minimum prefix length: 4 characters
  - Shows all matches when prefix is ambiguous
- ✨ 交互式界面自动检测当前项目，直接显示对话列表
- ✨ 对话列表支持快捷键操作
  - `e` 快捷导出 Markdown，`E` 选择格式导出
  - `i` 查看对话信息
  - `/` 搜索过滤，`Esc` 清除搜索
  - `1-9` 快速选择，上下键导航
  - `m` 返回主菜单，`q` 退出
- ✨ 扩展国际化支持（中/英文界面文案）

### Changed

- ♻️ 统一所有列表页面为键盘事件驱动交互风格
- ♻️ 抽象 InteractiveList 组件复用
- ✨ 将 `[m] 菜单` 快捷键提示改为 `[m] 首页`，更清晰表达返回主界面
- ✨ 使用滚动清屏代替直接清屏，保留终端历史上下文
- ✨ 操作完成后返回对话列表而非退出程序
- ✨ 检测当前项目时显示加载提示

### Removed

- 移除独立搜索页面，改为列表内 `/` 搜索
- 移除 inquirer 依赖

## [1.3.0] - 2026-02-03

### Added

- ✨ New `-l, --lang` option for language selection (en/zh), default is English
- ✨ New i18n module for internationalization support
- ✨ New `--verbose-tools` option to show full tool call JSON in Markdown export
- ✨ New noise filter module for cleaning user input content

### Changed

- ✨ Improved Markdown export format: conversations are now organized by turns instead of individual messages
- ✨ Added conversation turn count to header statistics (e.g., "42 messages (12 turns)")
- ⚡️ Tool calls now display in summary mode by default (showing tool name and key parameters)
- ⚡️ Added noise filtering for system tags (`<system-reminder>`, `<local-command-*>`, etc.)
- ⚡️ Dynamic code fence generation to handle content containing backticks
- ⚡️ Removed empty response placeholder text for turns without text content

### Fixed

- 🐛 Fixed `<thinking>` tags leaking into response text in Markdown export

## [1.2.0] - 2026-01-16

### Added

- ✨ Deleted project directories are marked with `[Deleted]` tag

### Changed

- ⚡️ Improved search results navigation: return to search results instead of main menu after viewing conversation

### Fixed

- 🐛 Fixed path decoding error: directory names containing `-` were incorrectly parsed as multi-level paths (e.g., `mall-items-b` was parsed as `mall/items/b`)

## [1.1.0] - 2025-01-15

### Added

- ✨ `completion:setup` command: one-click shell completion installation
- ✨ `completion:uninstall` command: uninstall shell completion
- ✨ Auto-prompt to enable completion after global install (postinstall)

### Changed

- 📝 Updated README installation instructions, added npm global install method

## [1.0.0] - 2025-01-15

### Added

- ✨ Interactive CLI interface with project browsing and search
- ✨ Support for Markdown, JSON, HTML export formats
- ✨ `list` command: list all projects and conversations
- ✨ `export` command: export specified conversation
- ✨ `stats` command: view statistics
- ✨ Support for subagent conversation export
- ✨ Token usage statistics
- ✨ Shell auto-completion support (bash, zsh, fish)
- 🔧 Makefile support for build and install commands
- 📦️ npm publish configuration

### Changed

- ⚡️ Improved interactive navigation: auto-return to conversation list after preview/export
- ✨ Added "🏠 Main Menu" option to return to main menu from any menu

### Technical

- 🎉 Project initialization
- 📝 Added README documentation
