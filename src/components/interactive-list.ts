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
