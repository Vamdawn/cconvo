import dayjs from 'dayjs';
import type {
  MessageRecord,
  UserMessage,
  AssistantMessage,
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

// 清理文本中的 thinking 标签
function cleanThinkingTags(text: string): string {
  return text.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
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

    const rawText = content
      .filter((block): block is TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');
    // 清理可能混入 text 块的 thinking 标签
    return cleanThinkingTags(rawText);
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

// 根据内容生成合适的代码围栏
export function getFenceForContent(text: string): string {
  let maxBackticks = 0;
  let current = 0;

  for (const char of text) {
    if (char === '`') {
      current++;
      maxBackticks = Math.max(maxBackticks, current);
    } else {
      current = 0;
    }
  }

  // 使用比内容中最长反引号序列多一个的数量，最少 3 个
  const fenceCount = Math.max(3, maxBackticks + 1);
  return '`'.repeat(fenceCount);
}

// 工具调用摘要
export interface ToolCallSummary {
  name: string;
  summary: string;
  input: Record<string, unknown>;
}

// 生成工具调用摘要
export function summarizeToolCall(tool: ToolUseBlock): ToolCallSummary {
  const { name, input } = tool;
  let summary = '';

  switch (name) {
    case 'Read':
    case 'Write':
    case 'Edit':
      summary = (input as { file_path?: string }).file_path || '';
      break;
    case 'Glob':
      summary = (input as { pattern?: string }).pattern || '';
      break;
    case 'Grep':
      summary = (input as { pattern?: string }).pattern || '';
      break;
    case 'Bash':
      summary = (input as { command?: string }).command || '';
      break;
    case 'Task':
      const taskInput = input as { subagent_type?: string; description?: string };
      summary = `${taskInput.subagent_type || ''}: ${taskInput.description || ''}`;
      break;
    case 'WebFetch':
      summary = (input as { url?: string }).url || '';
      break;
    case 'WebSearch':
      summary = (input as { query?: string }).query || '';
      break;
    case 'LSP':
      const lspInput = input as { operation?: string; filePath?: string };
      summary = `${lspInput.operation || ''} ${lspInput.filePath || ''}`;
      break;
    case 'NotebookEdit':
      summary = (input as { notebook_path?: string }).notebook_path || '';
      break;
    default:
      summary = truncate(JSON.stringify(input), 80);
  }

  return { name, summary, input };
}

// 格式化时长
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
