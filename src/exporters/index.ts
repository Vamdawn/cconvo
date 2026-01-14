import { writeFile } from 'fs/promises';
import type { Conversation, ExportOptions } from '../models/types.js';
import { exportToMarkdown } from './markdown.js';
import { exportToJson } from './json.js';
import { exportToHtml } from './html.js';

// 导出对话
export async function exportConversation(
  conversation: Conversation,
  options: ExportOptions
): Promise<string> {
  let content: string;

  switch (options.format) {
    case 'markdown':
      content = exportToMarkdown(conversation, options);
      break;
    case 'json':
      content = exportToJson(conversation, options);
      break;
    case 'html':
      content = exportToHtml(conversation, options);
      break;
    default:
      throw new Error(`Unsupported format: ${options.format}`);
  }

  await writeFile(options.outputPath, content, 'utf-8');
  return content;
}

// 获取导出文件扩展名
export function getFileExtension(format: ExportOptions['format']): string {
  switch (format) {
    case 'markdown':
      return '.md';
    case 'json':
      return '.json';
    case 'html':
      return '.html';
    default:
      return '.txt';
  }
}

export { exportToMarkdown } from './markdown.js';
export { exportToJson } from './json.js';
export { exportToHtml } from './html.js';
