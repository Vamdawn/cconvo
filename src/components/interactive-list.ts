import chalk from 'chalk';
import readline from 'readline';
import { showBanner } from './banner.js';

// 列表项
export interface ListItem {
  id: string;
  label: string;
  description?: string;
  data?: unknown;
}

// 自定义快捷键
export interface ListShortcut {
  key: string;
  label: string;
  action: (item: ListItem) => Promise<void> | void;
}

// 列表配置
export interface ListConfig {
  title: string;
  items: ListItem[];
  emptyMessage?: string;
  maxVisible?: number;
  showIndex?: boolean;
  showBanner?: boolean;
  shortcuts?: ListShortcut[];
}

// 列表结果
export interface ListResult {
  action: 'select' | 'back' | 'quit' | 'main' | string;
  item?: ListItem;
}

// 滚动清屏
function scrollClear(): void {
  const rows = process.stdout.rows || 24;
  console.log('\n'.repeat(rows));
  process.stdout.write('\x1b[H');
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

// 构建快捷键提示
function buildShortcutsHint(shortcuts: ListShortcut[], isSearchMode: boolean): string {
  if (isSearchMode) {
    return chalk.gray('[Esc] 清除  [回车] 选择');
  }

  const customHints = shortcuts.map(s => `[${s.key}] ${s.label}`).join('  ');
  const baseHints = '[回车] 选择  [/] 搜索  [Esc] 返回  [q] 退出';

  return chalk.gray(customHints ? `${customHints}  ${baseHints}` : baseHints);
}

// 渲染列表
function renderList(
  config: ListConfig,
  items: ListItem[],
  selectedIndex: number,
  searchTerm: string,
  shortcuts: ListShortcut[]
): void {
  scrollClear();

  if (config.showBanner !== false) {
    showBanner();
  }

  // 标题和计数
  const count = items.length;
  console.log(chalk.bold(`  ${config.title}`) + chalk.gray(` (${count})`));
  console.log();

  // 搜索状态
  if (searchTerm) {
    console.log(chalk.cyan(`  搜索: ${searchTerm}_`));
    console.log();
  }

  // 列表项
  const maxVisible = config.maxVisible || 15;
  const showIndex = config.showIndex !== false;

  if (items.length === 0) {
    console.log(chalk.yellow(`  ${config.emptyMessage || '无数据'}`));
  } else {
    for (let i = 0; i < Math.min(items.length, maxVisible); i++) {
      const item = items[i];
      const prefix = showIndex ? `${(i + 1).toString().padStart(2)}. ` : '  ';
      const marker = i === selectedIndex ? '› ' : '  ';
      const desc = item.description ? chalk.gray(`  ${item.description}`) : '';
      const line = `  ${prefix}${marker}${item.label}${desc}`;

      if (i === selectedIndex) {
        console.log(chalk.bgBlue.white(line));
      } else {
        console.log(line);
      }
    }

    if (items.length > maxVisible) {
      console.log(chalk.gray(`  ... 还有 ${items.length - maxVisible} 项`));
    }
  }

  // 快捷键提示
  console.log();
  console.log(buildShortcutsHint(shortcuts, searchTerm !== ''));
}
