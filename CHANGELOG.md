# Changelog

本项目的所有重要变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

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
