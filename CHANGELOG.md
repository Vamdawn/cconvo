# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- ✨ List components support left/right arrow keys for page navigation

### Changed

- ♻️ Home shortcut key changed from `[m]` to `[h]`
- ♻️ Main menu title changed from "Menu" to "Home", count display removed
- ♻️ Conversation list now displays project absolute path instead of "(Current Project)"

### Removed

- Removed search shortcut `/` from conversation list

### Fixed

- 🐛 Fix program freeze when pressing ESC in main menu

## [1.6.0] - 2026-02-06

### Added

- ✨ Add `release` skill for automated version release workflow
  - Analyze git commits to infer semantic version (major/minor/patch)
  - Auto-generate bilingual CHANGELOG (English/Chinese)
  - Interactive preview before execution
  - Create git commit and tag
- ✨ Add split-screen info panel for conversation list
  - Display conversation info automatically when selected (no need to press Enter or [i])
  - Show duration, file size, token usage (input/output), and first user message preview
  - Cache new metadata fields (totalTokens, firstUserMessage) for faster loading
  - Dynamic list height calculation based on terminal size
  - Clean noise from first message preview (filter command tags, system reminders)

## [1.5.1] - 2026-02-05

### Changed

- ✨ Improve Markdown export formatting
  - Wrap user input and Claude response in code fences
  - Wrap Tool Calls in collapsible `<details>` block
  - Show "No output" hint when response is completely empty (i18n supported)

## [1.5.0] - 2026-02-05

### Added

- ✨ Add metadata cache mechanism, stored in `~/.cconvo/cache.json`
  - Automatically cache conversation metadata after first scan
  - Validate cache based on file modification time

### Changed

- ⚡️ Significantly improve project and conversation scanning performance
  - Use parallel processing to scan multiple projects and conversations
  - Combined with caching, second launch is ~70x faster

## [1.4.0] - 2026-02-05

### Added

- ✨ `export` command supports partial session ID prefix matching (like git commit short hash)
  - Minimum prefix length: 4 characters
  - Shows all matches when prefix is ambiguous
- ✨ Interactive interface auto-detects current project and shows conversation list directly
- ✨ Conversation list keyboard shortcuts
  - `e` quick export to Markdown, `E` select format to export
  - `i` view conversation info
  - `/` search filter, `Esc` clear search
  - `1-9` quick select, arrow keys to navigate
  - `m` return to main menu, `q` quit
- ✨ Extended i18n support (Chinese/English UI)
- ✨ New settings menu with language switch (English/Simplified Chinese)
- ✨ Persistent settings storage (~/.cconvo/settings.json)
- ✨ CLI commands (list, export, stats) support i18n

### Changed

- ♻️ Unified all list pages to keyboard event-driven interaction style
- ♻️ Abstract InteractiveList component for reuse
- ♻️ Unified all UI strings to use i18n
- ✨ Changed `[m] Menu` shortcut hint to `[m] Home` for clarity
- ✨ Use scroll clear instead of direct clear to preserve terminal history
- ✨ Return to conversation list after operation instead of exiting
- ✨ Show loading indicator when detecting current project

### Removed

- Removed standalone search page, replaced with in-list `/` search
- Removed inquirer dependency

### Fixed

- 🐛 Fix scrolling issue when list has more than 15 items

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
