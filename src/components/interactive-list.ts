import chalk from 'chalk';
import readline from 'readline';
import { showBanner } from './banner.js';
import { t, type Language } from '../utils/i18n.js';
import { waitForKeypress, isCtrlC } from '../utils/terminal.js';

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
  showCount?: boolean;  // 是否显示计数，默认 true
  shortcuts?: ListShortcut[];
  language?: Language;
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

// 构建快捷键提示
function buildShortcutsHint(shortcuts: ListShortcut[], isSearchMode: boolean, lang: Language): string {
  if (isSearchMode) {
    return chalk.gray(t('listShortcutsSearch', lang));
  }

  const customHints = shortcuts.map(s => `[${s.key}] ${s.label}`).join('  ');
  const baseHints = t('listShortcuts', lang);

  return chalk.gray(customHints ? `${customHints}  ${baseHints}` : baseHints);
}

// 渲染列表
function renderList(
  config: ListConfig,
  items: ListItem[],
  selectedIndex: number,
  searchTerm: string,
  shortcuts: ListShortcut[],
  lang: Language
): void {
  scrollClear();

  if (config.showBanner !== false) {
    showBanner();
  }

  // 标题和计数
  const count = items.length;
  const countText = config.showCount !== false ? chalk.gray(` (${count})`) : '';
  console.log(chalk.bold(`  ${config.title}`) + countText);
  console.log();

  // 搜索状态
  if (searchTerm) {
    console.log(chalk.cyan(`  ${t('searchPlaceholder', lang)}: ${searchTerm}_`));
    console.log();
  }

  // 列表项
  const maxVisible = config.maxVisible || 15;
  const showIndex = config.showIndex !== false;

  if (items.length === 0) {
    console.log(chalk.yellow(`  ${config.emptyMessage || t('noData', lang)}`));
  } else {
    // 计算滚动视口的起始位置，确保选中项始终可见
    let startIndex = 0;
    if (selectedIndex >= maxVisible) {
      startIndex = selectedIndex - maxVisible + 1;
    }
    const endIndex = Math.min(startIndex + maxVisible, items.length);

    // 显示上方省略提示
    if (startIndex > 0) {
      console.log(chalk.gray(`  ... ${startIndex} ${t('moreItemsAbove', lang)}`));
    }

    for (let i = startIndex; i < endIndex; i++) {
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

    // 显示下方省略提示
    if (endIndex < items.length) {
      console.log(chalk.gray(`  ... ${items.length - endIndex} ${t('moreItems', lang)}`));
    }
  }

  // 快捷键提示
  console.log();
  console.log(buildShortcutsHint(shortcuts, searchTerm !== '', lang));
}

// 主函数
export async function showInteractiveList(config: ListConfig): Promise<ListResult> {
  let selectedIndex = 0;
  let searchTerm = '';
  let filteredItems = [...config.items];
  const shortcuts = config.shortcuts || [];
  const lang = config.language || 'en';

  // 过滤列表
  function filterItems(): void {
    if (!searchTerm) {
      filteredItems = [...config.items];
    } else {
      const term = searchTerm.toLowerCase();
      filteredItems = config.items.filter(item =>
        item.label.toLowerCase().includes(term) ||
        (item.description && item.description.toLowerCase().includes(term))
      );
    }
    selectedIndex = Math.min(selectedIndex, Math.max(0, filteredItems.length - 1));
  }

  // 设置终端
  process.stdin.setRawMode(true);
  process.stdin.resume();
  readline.emitKeypressEvents(process.stdin);

  return new Promise(resolve => {
    const cleanup = (result: ListResult) => {
      process.stdin.removeListener('keypress', handleKeypress);
      process.stdin.setRawMode(false);
      resolve(result);
    };

    const handleKeypress = async (str: string | undefined, key: readline.Key) => {
      // Ctrl+C 安全退出
      if (isCtrlC(str, key)) {
        process.stdin.pause();
        cleanup({ action: 'quit' });
        return;
      }

      // 搜索模式
      if (searchTerm !== '' || key.name === 'slash' || str === '/') {
        if (key.name === 'escape') {
          searchTerm = '';
          filterItems();
          renderList(config, filteredItems, selectedIndex, searchTerm, shortcuts, lang);
          return;
        }
        if (key.name === 'return') {
          if (filteredItems.length > 0) {
            cleanup({ action: 'select', item: filteredItems[selectedIndex] });
          }
          return;
        }
        if (key.name === 'backspace') {
          searchTerm = searchTerm.slice(0, -1);
          filterItems();
          renderList(config, filteredItems, selectedIndex, searchTerm, shortcuts, lang);
          return;
        }
        if (str && str.length === 1 && !key.ctrl && !key.meta) {
          if (str === '/' && searchTerm === '') {
            renderList(config, filteredItems, selectedIndex, searchTerm, shortcuts, lang);
            return;
          }
          searchTerm += str;
          filterItems();
          renderList(config, filteredItems, selectedIndex, searchTerm, shortcuts, lang);
          return;
        }
        return;
      }

      // 普通模式
      switch (key.name) {
        case 'up':
          selectedIndex = Math.max(0, selectedIndex - 1);
          renderList(config, filteredItems, selectedIndex, searchTerm, shortcuts, lang);
          break;
        case 'down':
          selectedIndex = Math.min(filteredItems.length - 1, selectedIndex + 1);
          renderList(config, filteredItems, selectedIndex, searchTerm, shortcuts, lang);
          break;
        case 'left':
          // 向上翻页
          {
            const pageSize = config.maxVisible || 15;
            selectedIndex = Math.max(0, selectedIndex - pageSize);
            renderList(config, filteredItems, selectedIndex, searchTerm, shortcuts, lang);
          }
          break;
        case 'right':
          // 向下翻页
          {
            const pageSize = config.maxVisible || 15;
            selectedIndex = Math.min(filteredItems.length - 1, selectedIndex + pageSize);
            renderList(config, filteredItems, selectedIndex, searchTerm, shortcuts, lang);
          }
          break;
        case 'return':
          if (filteredItems.length > 0) {
            cleanup({ action: 'select', item: filteredItems[selectedIndex] });
          }
          break;
        // escape 键不再用于返回，改用 b 键
        default:
          if (str) {
            // 数字快捷键 1-9
            if (str >= '1' && str <= '9') {
              const idx = parseInt(str) - 1;
              if (idx < filteredItems.length) {
                selectedIndex = idx;
                renderList(config, filteredItems, selectedIndex, searchTerm, shortcuts, lang);
              }
              return;
            }

            // b 返回
            if (str.toLowerCase() === 'b') {
              cleanup({ action: 'back' });
              return;
            }

            // q 退出
            if (str.toLowerCase() === 'q') {
              process.stdin.pause();
              cleanup({ action: 'quit' });
              return;
            }

            // h 主菜单
            if (str.toLowerCase() === 'h') {
              cleanup({ action: 'main' });
              return;
            }

            // 自定义快捷键
            for (const shortcut of shortcuts) {
              if (str === shortcut.key && filteredItems.length > 0) {
                process.stdin.removeListener('keypress', handleKeypress);
                process.stdin.setRawMode(false);

                await shortcut.action(filteredItems[selectedIndex]);
                await waitForKeypress();

                process.stdin.setRawMode(true);
                process.stdin.on('keypress', handleKeypress);
                renderList(config, filteredItems, selectedIndex, searchTerm, shortcuts, lang);
                return;
              }
            }

            // / 进入搜索
            if (str === '/') {
              searchTerm = '';
              renderList(config, filteredItems, selectedIndex, searchTerm, shortcuts, lang);
            }
          }
      }
    };

    process.stdin.on('keypress', handleKeypress);
    renderList(config, filteredItems, selectedIndex, searchTerm, shortcuts, lang);
  });
}
