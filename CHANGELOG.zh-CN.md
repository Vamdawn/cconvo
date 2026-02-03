# Changelog

本项目的所有重要变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- ✨ `export` 命令支持部分 session ID 前缀匹配（类似 git commit 短哈希）
  - 最小前缀长度：4 个字符
  - 前缀匹配多个对话时显示所有匹配项

## [1.3.0] - 2026-02-03

### Added

- ✨ 新增 `-l, --lang` 选项：支持选择输出语言 (en/zh)，默认英文
- ✨ 新增 i18n 国际化模块
- ✨ 新增 `--verbose-tools` 选项：在 Markdown 导出中显示完整工具调用 JSON
- ✨ 新增噪音过滤模块：清理用户输入中的系统标签

### Changed

- ✨ 改进 Markdown 导出格式：按对话轮次组织，而非单条消息
- ✨ 头部统计信息增加对话轮次计数（如 "42 条 (12 轮对话)"）
- ⚡️ 工具调用默认以摘要模式显示（显示工具名和关键参数）
- ⚡️ 添加系统标签噪音过滤（`<system-reminder>`、`<local-command-*>` 等）
- ⚡️ 动态代码围栏生成：正确处理包含反引号的内容
- ⚡️ 移除无文本回复时的占位提示文本

### Fixed

- 🐛 修复 Markdown 导出中 `<thinking>` 标签泄露到响应文本的问题

## [1.2.0] - 2026-01-16

### Added

- ✨ 已删除的项目目录显示 `[Deleted]` 标记

### Changed

- ⚡️ 优化搜索结果页导航：查看对话后返回搜索结果页而非主菜单

### Fixed

- 🐛 修复路径解码错误：包含 `-` 的目录名被错误解析为多级路径（如 `mall-items-b` 被解析为 `mall/items/b`）

## [1.1.0] - 2025-01-15

### Added

- ✨ `completion:setup` 命令：一键安装 Shell 补全到配置文件
- ✨ `completion:uninstall` 命令：卸载 Shell 补全
- ✨ 全局安装后自动提示启用补全 (postinstall)

### Changed

- 📝 更新 README 安装说明，添加 npm 全局安装方式

## [1.0.0] - 2025-01-15

### Added

- ✨ 交互式 CLI 界面，支持项目浏览和搜索
- ✨ 支持 Markdown、JSON、HTML 三种导出格式
- ✨ `list` 命令：列出所有项目和对话
- ✨ `export` 命令：导出指定对话
- ✨ `stats` 命令：查看统计信息
- ✨ 支持子代理 (subagent) 对话导出
- ✨ Token 使用量统计
- ✨ Shell 自动补全支持 (bash, zsh, fish)
- 🔧 Makefile 支持构建和安装命令
- 📦️ npm publish 配置

### Changed

- ⚡️ 优化交互式导航：预览/导出完成后自动返回对话列表
- ✨ 添加 "🏠 Main Menu" 选项，可从任意菜单直接返回主菜单

### Technical

- 🎉 项目初始化
- 📝 添加 README 使用文档
