import type { Conversation, ExportOptions, ContentBlock, AssistantMessage } from '../models/types.js';

// 过滤内容块类型
function filterContentBlocks(
  content: ContentBlock[],
  excludeTypes: string[]
): ContentBlock[] {
  return content.filter(block => !excludeTypes.includes(block.type));
}

// 导出为JSON格式
export function exportToJson(conversation: Conversation, options: ExportOptions): string {
  // 深拷贝消息以避免修改原始数据
  const filteredMessages = conversation.messages
    .filter(m => m.type === 'user' || m.type === 'assistant')
    .map(m => {
      if (m.type !== 'assistant') return m;

      const assistantMsg = m as AssistantMessage;
      const excludeTypes: string[] = [];

      if (!options.includeThinking) excludeTypes.push('thinking');
      if (!options.includeToolCalls) excludeTypes.push('tool_use');

      if (excludeTypes.length === 0) return m;

      return {
        ...assistantMsg,
        message: {
          ...assistantMsg.message,
          content: filterContentBlocks(assistantMsg.message.content, excludeTypes),
        },
      };
    });

  const output: Record<string, unknown> = {
    sessionId: conversation.sessionId,
    slug: conversation.slug,
    projectPath: conversation.projectPath,
    startTime: conversation.startTime.toISOString(),
    endTime: conversation.endTime.toISOString(),
    messageCount: conversation.messageCount,
    totalTokens: conversation.totalTokens,
    messages: filteredMessages,
  };

  // 包含子代理对话
  if (options.includeSubagents && conversation.subagents.length > 0) {
    output.subagents = conversation.subagents;
  }

  return JSON.stringify(output, null, 2);
}
