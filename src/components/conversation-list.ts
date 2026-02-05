// src/components/conversation-list.ts
import chalk from 'chalk';
import readline from 'readline';
import { formatDateTime } from '../utils/format.js';
import { t, type Language } from '../utils/i18n.js';
import { exportConversation, getFileExtension } from '../exporters/index.js';
import { parseConversation } from '../core/parser.js';
import type { Project, ConversationSummary, ExportOptions } from '../models/types.js';
import { showBanner } from './banner.js';
import { getLanguage } from '../utils/settings.js';

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

// 显示对话信息
async function showInfo(
  project: Project,
  conv: ConversationSummary
): Promise<void> {
  console.log();
  console.log(chalk.bold('─'.repeat(40)));
  console.log(chalk.bold(t('conversationInfo', getLang())));
  console.log(chalk.bold('─'.repeat(40)));
  console.log(`${chalk.gray(t('sessionId', getLang()) + ':')}    ${conv.sessionId}`);
  console.log(`${chalk.gray(t('startTime', getLang()) + ':')}  ${formatDateTime(conv.startTime)}`);
  console.log(`${chalk.gray(t('messageCount', getLang()) + ':')}  ${conv.messageCount}`);
  console.log(`${chalk.gray(t('projectPath', getLang()) + ':')}  ${project.originalPath}`);
  console.log();
  console.log(t('pressAnyKeyToReturn', getLang()));

  await waitForKeypress();
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
  console.log(chalk.bold.blue(`📁 ${project.name}`) + deletedTag + chalk.gray(` (${t('currentProject', getLang())})`));
  console.log(chalk.bold('─'.repeat(40)));
  console.log();

  // 搜索栏
  if (searchTerm) {
    console.log(chalk.cyan(`${t('searchPlaceholder', getLang())}: ${searchTerm}_`));
    console.log();
  }

  // 对话列表
  if (conversations.length === 0) {
    console.log(chalk.yellow(searchTerm ? t('noMatchingConversations', getLang()) : t('noConversationsFound', getLang())));
  } else {
    for (let i = 0; i < conversations.length && i < 15; i++) {
      const line = formatConversationItem(i, conversations[i], getLang());
      if (i === selectedIndex) {
        console.log(chalk.bgBlue.white(line));
      } else {
        console.log(line);
      }
    }

    if (conversations.length > 15) {
      console.log(chalk.gray(`  ... ${conversations.length - 15} ${t('more', getLang())}`));
    }
  }

  // 快捷键提示
  console.log();
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
      // 搜索模式下的按键处理
      if (searchTerm !== '' || key.name === 'slash' || str === '/') {
        if (key.name === 'escape') {
          searchTerm = '';
          filterConversations();
          renderList(project, filteredConversations, selectedIndex, searchTerm);
          return;
        }
        if (key.name === 'return') {
          if (filteredConversations.length > 0) {
            // 进入选中对话的操作
            process.stdin.removeListener('keypress', handleKeypress);
            process.stdin.setRawMode(false);
            await showInfo(project, filteredConversations[selectedIndex]);
            // 返回后重新启动
            process.stdin.setRawMode(true);
            process.stdin.on('keypress', handleKeypress);
          }
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
        case 'return':
          if (filteredConversations.length > 0) {
            process.stdin.removeListener('keypress', handleKeypress);
            process.stdin.setRawMode(false);
            await showInfo(project, filteredConversations[selectedIndex]);
            process.stdin.setRawMode(true);
            process.stdin.on('keypress', handleKeypress);
            renderList(project, filteredConversations, selectedIndex, searchTerm);
          }
          break;
        case 'escape':
          process.stdin.removeListener('keypress', handleKeypress);
          process.stdin.setRawMode(false);
          console.clear();
          resolve({ action: 'back' });
          return;
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
              case 'q':
                process.stdin.removeListener('keypress', handleKeypress);
                process.stdin.setRawMode(false);
                process.stdin.pause();
                console.clear();
                resolve({ action: 'quit' });
                return;
              case 'm':
                process.stdin.removeListener('keypress', handleKeypress);
                process.stdin.setRawMode(false);
                console.clear();
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
              case 'i':
                if (filteredConversations.length > 0) {
                  process.stdin.removeListener('keypress', handleKeypress);
                  process.stdin.setRawMode(false);
                  await showInfo(project, filteredConversations[selectedIndex]);
                  process.stdin.setRawMode(true);
                  process.stdin.on('keypress', handleKeypress);
                  renderList(project, filteredConversations, selectedIndex, searchTerm);
                }
                break;
              case '/':
                // 进入搜索模式
                searchTerm = '';
                renderList(project, filteredConversations, selectedIndex, searchTerm);
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
