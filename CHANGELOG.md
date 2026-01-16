# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
