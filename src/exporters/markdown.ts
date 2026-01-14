import type {
  Conversation,
  MessageRecord,
  UserMessage,
  AssistantMessage,
  ExportOptions,
} from '../models/types.js';
import {
  formatDateTime,
  formatTokens,
  extractTextContent,
  extractThinking,
  extractToolCalls,
} from '../utils/format.js';

// 导出为Markdown格式
export function exportToMarkdown(conversation: Conversation, options: ExportOptions): string {
  const lines: string[] = [];

  // 标题和元数据
  lines.push(`# ${conversation.slug || conversation.sessionId}`);
  lines.push('');
  lines.push(`> **Project**: ${conversation.projectPath}`);
  lines.push(`> **Session ID**: ${conversation.sessionId}`);
  lines.push(`> **Time**: ${formatDateTime(conversation.startTime)} - ${formatDateTime(conversation.endTime)}`);
  lines.push(`> **Messages**: ${conversation.messageCount}`);
  lines.push(`> **Tokens**: Input ${formatTokens(conversation.totalTokens.input_tokens)} / Output ${formatTokens(conversation.totalTokens.output_tokens)}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 消息列表
  const messages = conversation.messages.filter(
    m => m.type === 'user' || m.type === 'assistant'
  ) as (UserMessage | AssistantMessage)[];

  for (const message of messages) {
    lines.push(formatMessage(message, options));
    lines.push('');
  }

  // 子代理对话
  if (options.includeSubagents && conversation.subagents.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Subagent Conversations');
    lines.push('');

    for (const subagent of conversation.subagents) {
      lines.push(`### Agent: ${subagent.agentId}`);
      lines.push('');

      const subMessages = subagent.messages.filter(
        m => m.type === 'user' || m.type === 'assistant'
      ) as (UserMessage | AssistantMessage)[];

      for (const message of subMessages) {
        lines.push(formatMessage(message, options));
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

// 格式化单条消息
function formatMessage(message: UserMessage | AssistantMessage, options: ExportOptions): string {
  const lines: string[] = [];
  const timestamp = formatDateTime(message.timestamp);
  const role = message.type === 'user' ? 'User' : 'Assistant';

  lines.push(`### ${role} (${timestamp})`);
  lines.push('');

  // 思考过程
  if (options.includeThinking && message.type === 'assistant') {
    const thinkings = extractThinking(message);
    if (thinkings.length > 0) {
      lines.push('<details>');
      lines.push('<summary>Thinking</summary>');
      lines.push('');
      for (const thinking of thinkings) {
        lines.push('```');
        lines.push(thinking);
        lines.push('```');
        lines.push('');
      }
      lines.push('</details>');
      lines.push('');
    }
  }

  // 工具调用
  if (options.includeToolCalls && message.type === 'assistant') {
    const toolCalls = extractToolCalls(message);
    if (toolCalls.length > 0) {
      for (const tool of toolCalls) {
        lines.push(`<details>`);
        lines.push(`<summary>Tool: ${tool.name}</summary>`);
        lines.push('');
        lines.push('```json');
        lines.push(JSON.stringify(tool.input, null, 2));
        lines.push('```');
        lines.push('</details>');
        lines.push('');
      }
    }
  }

  // 文本内容
  const textContent = extractTextContent(message);
  if (textContent) {
    lines.push(textContent);
  }

  return lines.join('\n');
}
