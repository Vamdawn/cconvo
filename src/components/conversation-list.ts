// src/components/conversation-list.ts
import chalk from 'chalk';
import readline from 'readline';
import { writeFile } from 'fs/promises';
import { formatDateTime, formatSize, formatTokens, formatDuration } from '../utils/format.js';
import { t, type Language } from '../utils/i18n.js';
import { exportConversation, getFileExtension } from '../exporters/index.js';
import { parseConversation } from '../core/parser.js';
import { analyzeConversation, formatAnalysisResult } from '../llm/analyzer.js';
import type { Project, ConversationSummary, ExportOptions } from '../models/types.js';
import { showBanner } from './banner.js';
import { getLanguage, getActiveLLMProvider } from '../utils/settings.js';

// 获取当前语言
function getLang(): Language {
  return getLanguage();
}

// 对话列表操作结果
export type ConversationListResult =
  | { action: 'back' }
  | { action: 'main' }
  | { action: 'quit' };

// 格式化对话显示
function formatConversationItem(
  index: number,
  conv: ConversationSummary,
  lang: Language
): string {
  const time = formatDateTime(conv.startTime);
  const title = conv.slug || conv.sessionId.slice(0, 8);
  const msgs = `${conv.messageCount} ${t('msgs', lang)}`;
  return `  ${(index + 1).toString().padStart(2)}. ${time}  ${title} (${msgs})`;
}

// 渲染信息面板
function renderInfoPanel(conv: ConversationSummary): void {
  const lang = getLang();
  const width = Math.min(process.stdout.columns || 60, 60);
  const line = '─'.repeat(width);

  console.log(chalk.gray(line));
  console.log(chalk.bold(` ${t('conversationInfo', lang)}`));
  console.log(chalk.gray(line));

  // 第一行：开始时间 + 时长
  const startTimeLabel = `${t('startTime', lang)}:`;
  const durationLabel = `${t('duration', lang)}:`;
  console.log(` ${chalk.gray(startTimeLabel)} ${formatDateTime(conv.startTime)}    ${chalk.gray(durationLabel)} ${formatDuration(conv.duration)}`);

  // 第二行：消息数量 + 文件大小
  const msgCountLabel = `${t('messageCount', lang)}:`;
  const sizeLabel = `${t('fileSize', lang)}:`;
  console.log(` ${chalk.gray(msgCountLabel)} ${conv.messageCount}    ${chalk.gray(sizeLabel)} ${formatSize(conv.fileSize)}`);

  // 第三行：Token 统计
  const inputLabel = t('inputTokens', lang);
  const outputLabel = t('outputTokens', lang);
  console.log(` ${chalk.gray('Token:')} ${inputLabel} ${formatTokens(conv.totalTokens.input_tokens)} / ${outputLabel} ${formatTokens(conv.totalTokens.output_tokens)}`);

  console.log(chalk.gray(line));

  // 首条消息
  console.log(` ${chalk.gray(t('firstMessage', lang) + ':')}`);
  console.log(` ${chalk.dim(conv.firstUserMessage || t('none', lang))}`);
  console.log(chalk.gray(line));
}

// AI 分析
async function performAnalysis(
  project: Project,
  conv: ConversationSummary
): Promise<void> {
  const lang = getLang();
  const provider = getActiveLLMProvider();

  // 检查 LLM 配置
  if (!provider) {
    console.log(chalk.yellow(`\n  ${t('llmNotConfigured', lang)}`));
    await waitForKeypress();
    return;
  }

  // 解析完整会话
  const conversation = await parseConversation(conv.filePath, project.originalPath);

  if (conversation.messages.length === 0) {
    console.log(chalk.yellow(`\n  ${t('analysisNoData', lang)}`));
    await waitForKeypress();
    return;
  }

  console.log();

  // 定义分析阶段名称
  const phaseNames: Record<string, string> = {
    timeline: t('analysisTimeline', lang),
    patterns: t('analysisPatterns', lang),
    knowledge: t('analysisKnowledge', lang),
    quality: t('analysisQuality', lang),
  };

  let currentPhase = '';

  try {
    // 流式输出分析结果
    const result = await analyzeConversation(
      conversation,
      provider,
      lang,
      (phase, chunk) => {
        if (phase !== currentPhase) {
          currentPhase = phase;
          console.log();
          console.log(chalk.bold.cyan(`  ── ${phaseNames[phase] || phase} ──`));
          console.log();
        }
        process.stdout.write(chunk);
      }
    );

    console.log('\n');

    // 询问是否保存
    console.log(`  ${t('analysisSavePrompt', lang)} [y/n]`);
    const key = await waitForKeypress();

    if (key.toLowerCase() === 'y') {
      const markdown = formatAnalysisResult(result, conversation, lang);
      const outputPath = `${conv.slug || conv.sessionId}-analysis.md`;
      await writeFile(outputPath, markdown, 'utf-8');
      console.log(chalk.green(`  ✓ ${t('analysisSaved', lang)} ${outputPath}`));
      await waitForKeypress();
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.log(chalk.red(`\n  Error: ${errMsg}`));
    await waitForKeypress();
  }
}

// 快速导出（使用默认格式 Markdown）
async function quickExport(
  project: Project,
  conv: ConversationSummary
): Promise<void> {
  const conversation = await parseConversation(conv.filePath, project.originalPath);
  const outputPath = `${conv.slug || conv.sessionId}.md`;

  const exportOptions: ExportOptions = {
    format: 'markdown',
    includeThinking: true,
    includeToolCalls: true,
    includeSubagents: false,
    outputPath,
    verboseTools: false,
    language: getLang(),
  };

  await exportConversation(conversation, exportOptions);
  console.log(chalk.green(`✓ ${t('exported', getLang())}: ${outputPath}`));

  await waitForKeypress();
}

// 导出选项（选择格式）
async function exportWithOptions(
  project: Project,
  conv: ConversationSummary
): Promise<void> {
  console.log();
  console.log(`${t('exportFormat', getLang())}: [M]arkdown  [J]SON  [H]TML`);

  const key = await waitForKeypress();
  let format: 'markdown' | 'json' | 'html' = 'markdown';

  if (key === 'j' || key === 'J') {
    format = 'json';
  } else if (key === 'h' || key === 'H') {
    format = 'html';
  }

  const conversation = await parseConversation(conv.filePath, project.originalPath);
  const outputPath = `${conv.slug || conv.sessionId}${getFileExtension(format)}`;

  const exportOptions: ExportOptions = {
    format,
    includeThinking: true,
    includeToolCalls: true,
    includeSubagents: false,
    outputPath,
    verboseTools: false,
    language: getLang(),
  };

  await exportConversation(conversation, exportOptions);
  console.log(chalk.green(`✓ ${t('exported', getLang())}: ${outputPath}`));

  await waitForKeypress();
}

// 等待按键
function waitForKeypress(): Promise<string> {
  return new Promise(resolve => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', (data) => {
      process.stdin.setRawMode(false);
      resolve(data.toString());
    });
  });
}

// 滚动清屏（将内容推上去而非截断）
function scrollClear(): void {
  const rows = process.stdout.rows || 24;
  console.log('\n'.repeat(rows));
  process.stdout.write('\x1b[H');
}

// 渲染对话列表界面
function renderList(
  project: Project,
  conversations: ConversationSummary[],
  selectedIndex: number,
  searchTerm: string
): void {
  scrollClear();
  showBanner();

  // 标题
  const deletedTag = project.isDeleted ? chalk.red(` [${t('deleted', getLang())}]`) : '';
  console.log(chalk.bold.blue(`📁 ${project.name}`) + deletedTag);
  console.log(chalk.gray(`  ${project.originalPath}`));
  console.log(chalk.bold('─'.repeat(40)));
  console.log();

  // 搜索栏
  if (searchTerm) {
    console.log(chalk.cyan(`${t('searchPlaceholder', getLang())}: ${searchTerm}_`));
    console.log();
  }

  // 计算可用行数：终端高度 - banner(4) - 项目标题(3) - 信息面板(10) - 快捷键(2) - 搜索栏
  const infoBoxHeight = 10;
  const headerHeight = 8 + (searchTerm ? 2 : 0);
  const footerHeight = 2;
  const availableRows = (process.stdout.rows || 24) - headerHeight - infoBoxHeight - footerHeight;
  const maxVisible = Math.max(5, Math.min(15, availableRows));

  // 对话列表
  if (conversations.length === 0) {
    console.log(chalk.yellow(searchTerm ? t('noMatchingConversations', getLang()) : t('noConversationsFound', getLang())));
  } else {
    // 计算滚动视口的起始位置，确保选中项始终可见
    let startIndex = 0;
    if (selectedIndex >= maxVisible) {
      startIndex = selectedIndex - maxVisible + 1;
    }
    const endIndex = Math.min(startIndex + maxVisible, conversations.length);

    // 显示上方省略提示
    if (startIndex > 0) {
      console.log(chalk.gray(`  ... ${startIndex} ${t('moreItemsAbove', getLang())}`));
    }

    for (let i = startIndex; i < endIndex; i++) {
      const line = formatConversationItem(i, conversations[i], getLang());
      if (i === selectedIndex) {
        console.log(chalk.bgBlue.white(line));
      } else {
        console.log(line);
      }
    }

    // 显示下方省略提示
    if (endIndex < conversations.length) {
      console.log(chalk.gray(`  ... ${conversations.length - endIndex} ${t('more', getLang())}`));
    }
  }

  console.log();

  // 渲染信息面板
  if (conversations.length > 0) {
    renderInfoPanel(conversations[selectedIndex]);
  }

  // 快捷键提示
  console.log(chalk.gray(searchTerm ? t('shortcutsSearch', getLang()) : t('shortcuts', getLang())));
}

// 主函数：显示对话列表
export async function showConversationList(
  project: Project
): Promise<ConversationListResult> {
  let selectedIndex = 0;
  let searchTerm = '';
  let filteredConversations = [...project.conversations];

  // 过滤对话
  function filterConversations(): void {
    if (!searchTerm) {
      filteredConversations = [...project.conversations];
    } else {
      const term = searchTerm.toLowerCase();
      filteredConversations = project.conversations.filter(c =>
        (c.slug && c.slug.toLowerCase().includes(term)) ||
        c.sessionId.toLowerCase().includes(term)
      );
    }
    // 重置选择索引
    selectedIndex = Math.min(selectedIndex, Math.max(0, filteredConversations.length - 1));
  }

  // 设置终端为 raw mode
  process.stdin.setRawMode(true);
  process.stdin.resume();
  readline.emitKeypressEvents(process.stdin);

  return new Promise(resolve => {
    const handleKeypress = async (str: string | undefined, key: readline.Key) => {
      // 计算可见行数用于翻页
      const infoBoxHeight = 10;
      const headerHeight = 8 + (searchTerm ? 2 : 0);
      const footerHeight = 2;
      const availableRows = (process.stdout.rows || 24) - headerHeight - infoBoxHeight - footerHeight;
      const maxVisible = Math.max(5, Math.min(15, availableRows));

      // 搜索模式下的按键处理
      if (searchTerm !== '') {
        if (key.name === 'escape') {
          searchTerm = '';
          filterConversations();
          renderList(project, filteredConversations, selectedIndex, searchTerm);
          return;
        }
        if (key.name === 'return') {
          // 搜索模式下按回车仅重新渲染（信息已自动显示）
          renderList(project, filteredConversations, selectedIndex, searchTerm);
          return;
        }
        if (key.name === 'backspace') {
          searchTerm = searchTerm.slice(0, -1);
          filterConversations();
          renderList(project, filteredConversations, selectedIndex, searchTerm);
          return;
        }
        if (str && str.length === 1 && !key.ctrl && !key.meta) {
          if (str === '/' && searchTerm === '') {
            // 进入搜索模式
            renderList(project, filteredConversations, selectedIndex, searchTerm);
            return;
          }
          searchTerm += str;
          filterConversations();
          renderList(project, filteredConversations, selectedIndex, searchTerm);
          return;
        }
      }

      // 普通模式下的按键处理
      switch (key.name) {
        case 'up':
          selectedIndex = Math.max(0, selectedIndex - 1);
          renderList(project, filteredConversations, selectedIndex, searchTerm);
          break;
        case 'down':
          selectedIndex = Math.min(filteredConversations.length - 1, selectedIndex + 1);
          renderList(project, filteredConversations, selectedIndex, searchTerm);
          break;
        case 'left':
          // 向上翻页
          selectedIndex = Math.max(0, selectedIndex - maxVisible);
          renderList(project, filteredConversations, selectedIndex, searchTerm);
          break;
        case 'right':
          // 向下翻页
          selectedIndex = Math.min(filteredConversations.length - 1, selectedIndex + maxVisible);
          renderList(project, filteredConversations, selectedIndex, searchTerm);
          break;
        default:
          // 字符按键
          if (str) {
            const char = str.toLowerCase();

            // 数字快捷选择 1-9
            if (char >= '1' && char <= '9') {
              const idx = parseInt(char) - 1;
              if (idx < filteredConversations.length) {
                selectedIndex = idx;
                renderList(project, filteredConversations, selectedIndex, searchTerm);
              }
              return;
            }

            switch (char) {
              case 'b':
                // 返回
                process.stdin.removeListener('keypress', handleKeypress);
                process.stdin.setRawMode(false);
                resolve({ action: 'back' });
                return;
              case 'q':
                process.stdin.removeListener('keypress', handleKeypress);
                process.stdin.setRawMode(false);
                process.stdin.pause();
                resolve({ action: 'quit' });
                return;
              case 'h':
                process.stdin.removeListener('keypress', handleKeypress);
                process.stdin.setRawMode(false);
                resolve({ action: 'main' });
                return;
              case 'e':
                if (filteredConversations.length > 0) {
                  process.stdin.removeListener('keypress', handleKeypress);
                  process.stdin.setRawMode(false);
                  await quickExport(project, filteredConversations[selectedIndex]);
                  process.stdin.setRawMode(true);
                  process.stdin.on('keypress', handleKeypress);
                  renderList(project, filteredConversations, selectedIndex, searchTerm);
                }
                break;
              case 'E':
                if (filteredConversations.length > 0) {
                  process.stdin.removeListener('keypress', handleKeypress);
                  process.stdin.setRawMode(false);
                  await exportWithOptions(project, filteredConversations[selectedIndex]);
                  process.stdin.setRawMode(true);
                  process.stdin.on('keypress', handleKeypress);
                  renderList(project, filteredConversations, selectedIndex, searchTerm);
                }
                break;
              case 'a':
                if (filteredConversations.length > 0) {
                  process.stdin.removeListener('keypress', handleKeypress);
                  process.stdin.setRawMode(false);
                  await performAnalysis(project, filteredConversations[selectedIndex]);
                  process.stdin.setRawMode(true);
                  process.stdin.on('keypress', handleKeypress);
                  renderList(project, filteredConversations, selectedIndex, searchTerm);
                }
                break;
            }
          }
      }
    };

    process.stdin.on('keypress', handleKeypress);

    // 初始渲染
    renderList(project, filteredConversations, selectedIndex, searchTerm);
  });
}
