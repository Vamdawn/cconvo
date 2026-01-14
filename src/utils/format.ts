import dayjs from 'dayjs';
import type {
  MessageRecord,
  UserMessage,
  AssistantMessage,
  ContentBlock,
  TextBlock,
  ThinkingBlock,
  ToolUseBlock,
  ToolResultBlock,
} from '../models/types.js';

// 格式化日期时间
export function formatDateTime(date: Date | string): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

// 格式化日期
export function formatDate(date: Date | string): string {
  return dayjs(date).format('YYYY-MM-DD');
}

// 格式化文件大小
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// 格式化token数量
export function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(2)}M`;
}

// 提取消息文本内容
export function extractTextContent(message: MessageRecord): string {
  if (message.type === 'user') {
    const userMsg = message as UserMessage;
    const content = userMsg.message.content;
    if (typeof content === 'string') {
      return content;
    }
    return content
      .filter((block): block is TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');
  }

  if (message.type === 'assistant') {
    const assistantMsg = message as AssistantMessage;
    const content = assistantMsg.message.content;
    if (!Array.isArray(content)) return '';

    return content
      .filter((block): block is TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');
  }

  return '';
}

// 提取思考内容
export function extractThinking(message: MessageRecord): string[] {
  if (message.type !== 'assistant') return [];

  const assistantMsg = message as AssistantMessage;
  const content = assistantMsg.message.content;
  if (!Array.isArray(content)) return [];

  return content
    .filter((block): block is ThinkingBlock => block.type === 'thinking')
    .map(block => block.thinking);
}

// 提取工具调用
export function extractToolCalls(message: MessageRecord): ToolUseBlock[] {
  if (message.type !== 'assistant') return [];

  const assistantMsg = message as AssistantMessage;
  const content = assistantMsg.message.content;
  if (!Array.isArray(content)) return [];

  return content.filter((block): block is ToolUseBlock => block.type === 'tool_use');
}

// 提取工具结果
export function extractToolResults(message: MessageRecord): ToolResultBlock[] {
  if (message.type !== 'user') return [];

  const userMsg = message as UserMessage;
  const content = userMsg.message.content;
  if (typeof content === 'string') return [];

  return content.filter((block): block is ToolResultBlock => block.type === 'tool_result');
}

// 截断文本
export function truncate(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// 转义HTML特殊字符
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 转义Markdown特殊字符
export function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}[\]()#+\-.!])/g, '\\$1');
}
