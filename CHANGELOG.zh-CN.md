# Changelog

本项目的所有重要变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- ✨ 新增 AI 分析功能，通过 LLM API 对会话进行智能分析
  - 时间线摘要、使用模式分析、知识提取、质量评估四项分析
  - 流式输出到终端，可选保存为 Markdown 文件
  - 会话列表中按 `[a]` 键触发分析
- ✨ 新增 LLM 多配置管理
  - 支持 OpenAI 兼容协议和 Anthropic 原生协议
  - 预设供应商：OpenAI、Anthropic、Deepseek，支持自定义供应商
  - 连接测试、编辑、删除、切换活跃配置
  - 设置菜单新增「LLM 配置」入口
- ✨ 新增会话本地统计计算
  - 工具使用统计、Token 消耗明细、文件操作热点、每轮 Token 追踪

## [1.7.1] - 2026-02-07

### Changed

- ✨ Markdown 导出所有代码围栏添加 `markdown` 语言标识
  - 用户输入、Claude 回复、思考内容、子Agent回复均使用 ` ```markdown ` 开头
  - `getFenceForContent` 支持可选语言标识参数

## [1.7.0] - 2026-02-06

### Added

- ✨ 添加 Vitest 测试框架和核心模块单元测试
  - 覆盖 `core/parser.ts`、`core/scanner.ts`
  - 覆盖 `utils/format.ts`、`utils/path.ts`、`utils/noise-filter.ts`、`utils/i18n.ts`、`utils/cache.ts`
  - 67 个测试用例，覆盖格式化、路径编解码、噪音过滤、国际化、JSONL 解析
- ✨ Markdown 导出支持消息类型标注
  - Compact Summary 消息标注为 `[Compacted]` / `[已压缩]`
  - Task Notification 消息标注为 `[Agent]` / `[子Agent]`
  - Task Notification 内容格式化为结构化表格
  - Task Notification 结果（子Agent回复）使用代码围栏包裹
  - `isCompactSummary()`、`isTaskNotification()` 检测函数
  - `parseTaskNotification()`、`formatTaskNotification()` 格式化函数
  - 支持中英文国际化

## [1.6.1] - 2026-02-06

### Added

- ✨ 列表组件支持左右方向键翻页导航

### Changed

- ♻️ 首页快捷键从 `[m]` 改为 `[h]`
- ♻️ 主菜单标题从「菜单」改为「首页」，移除计数显示
- ♻️ 对话列表显示项目绝对路径而非「(当前项目)」
- ♻️ 返回快捷键从 `[Esc]` 改为 `[b]`

### Removed

- 移除对话列表搜索快捷键 `/`

### Fixed

- 🐛 修复主菜单按 ESC 程序卡死的问题
- 🐛 修复 ESC 返回卡顿，改用 `[b]` 键返回

## [1.6.0] - 2026-02-06

### Added

- ✨ 新增 `release` 技能用于自动化版本发布流程
  - 分析 git commit 推断语义化版本号（major/minor/patch）
  - 自动生成双语 CHANGELOG（中文/英文）
  - 执行前交互式预览确认
  - 创建 git commit 和 tag
- ✨ 新增对话列表分屏信息面板
  - 选中对话时自动显示信息（无需按 Enter 或 [i]）
  - 显示时长、文件大小、Token 使用量（输入/输出）、首条用户消息预览
  - 缓存新的元数据字段（totalTokens, firstUserMessage）加速加载
  - 根据终端大小动态计算列表高度
  - 清理首条消息预览中的噪音（过滤命令标签、系统提醒）

## [1.5.1] - 2026-02-05

### Changed

- ✨ 改进 Markdown 导出格式
  - 将用户输入和 Claude 响应包裹在代码围栏中
  - 将工具调用包裹在可折叠的 `<details>` 块中
  - 响应完全为空时显示「无输出」提示（支持国际化）

## [1.5.0] - 2026-02-05

### Added

- ✨ 新增元数据缓存机制，缓存存储在 `~/.cconvo/cache.json`
  - 首次扫描后自动缓存对话元数据
  - 基于文件修改时间判断缓存有效性

### Changed

- ⚡️ 大幅优化项目和对话扫描性能
  - 使用并行处理扫描多个项目和对话
  - 结合缓存机制，二次启动速度提升约 70 倍

## [1.4.0] - 2026-02-05

### Added

- ✨ `export` 命令支持部分会话 ID 前缀匹配（类似 git commit 短哈希）
  - 最小前缀长度：4 字符
  - 前缀不明确时显示所有匹配项
- ✨ 交互式界面自动检测当前项目，直接显示对话列表
- ✨ 对话列表支持快捷键操作
  - `e` 快捷导出 Markdown，`E` 选择格式导出
  - `i` 查看对话信息
  - `/` 搜索过滤，`Esc` 清除搜索
  - `1-9` 快速选择，上下键导航
  - `m` 返回主菜单，`q` 退出
- ✨ 扩展国际化支持（中/英文界面文案）
- ✨ 新增设置菜单，支持语言切换（英文/简体中文）
- ✨ 新增持久化配置存储（~/.cconvo/settings.json）
- ✨ CLI 命令（list、export、stats）支持国际化

### Changed

- ♻️ 统一所有列表页面为键盘事件驱动交互风格
- ♻️ 抽象 InteractiveList 组件复用
- ♻️ 统一所有 UI 字符串使用 i18n 国际化
- ✨ 将 `[m] 菜单` 快捷键提示改为 `[m] 首页`，更清晰表达返回主界面
- ✨ 使用滚动清屏代替直接清屏，保留终端历史上下文
- ✨ 操作完成后返回对话列表而非退出程序
- ✨ 检测当前项目时显示加载提示

### Removed

- 移除独立搜索页面，改为列表内 `/` 搜索
- 移除 inquirer 依赖

### Fixed

- 🐛 修复列表超过 15 项时无法滚动查看后续项目的问题

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
