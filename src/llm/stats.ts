import type {
  Conversation,
  ConversationStats,
  AssistantMessage,
  ToolUseBlock,
} from '../models/types.js';

// 从文件操作工具中提取文件路径
const FILE_TOOLS = new Set(['Read', 'Write', 'Edit', 'Glob', 'NotebookEdit']);

function extractFilePath(tool: ToolUseBlock): string | undefined {
  const input = tool.input as Record<string, unknown>;
  if (FILE_TOOLS.has(tool.name)) {
    return (input.file_path || input.notebook_path || input.pattern) as string | undefined;
  }
  return undefined;
}

// 计算会话统计
export function computeStats(conversation: Conversation): ConversationStats {
  const toolCounts = new Map<string, number>();
  const fileCounts = new Map<string, number>();
  const perTurnTokens: { turn: number; input: number; output: number }[] = [];
  let turnIndex = 0;

  for (const message of conversation.messages) {
    if (message.type !== 'assistant') continue;

    const assistantMsg = message as AssistantMessage;
    const content = assistantMsg.message.content;
    if (!Array.isArray(content)) continue;

    // 统计 Token
    if (assistantMsg.message.usage) {
      turnIndex++;
      perTurnTokens.push({
        turn: turnIndex,
        input: assistantMsg.message.usage.input_tokens || 0,
        output: assistantMsg.message.usage.output_tokens || 0,
      });
    }

    // 统计工具调用
    for (const block of content) {
      if (block.type !== 'tool_use') continue;
      const tool = block as ToolUseBlock;
      toolCounts.set(tool.name, (toolCounts.get(tool.name) || 0) + 1);

      // 统计文件操作
      const filePath = extractFilePath(tool);
      if (filePath) {
        fileCounts.set(filePath, (fileCounts.get(filePath) || 0) + 1);
      }
    }
  }

  // 计算工具使用百分比
  const totalToolCalls = Array.from(toolCounts.values()).reduce((a, b) => a + b, 0);
  const toolUsage = Array.from(toolCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalToolCalls > 0 ? Math.round((count / totalToolCalls) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 文件操作排序
  const fileOperations = Array.from(fileCounts.entries())
    .map(([file, count]) => ({ file, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10

  // Token 汇总
  const totalInput = conversation.totalTokens.input_tokens;
  const totalOutput = conversation.totalTokens.output_tokens;
  const cacheCreation = conversation.totalTokens.cache_creation_input_tokens || 0;
  const cacheRead = conversation.totalTokens.cache_read_input_tokens || 0;
  const cacheHitRate = totalInput > 0 ? (cacheRead / totalInput) * 100 : 0;

  // 计算时长
  const totalDuration = conversation.endTime.getTime() - conversation.startTime.getTime();

  // 计算对话轮次（user 消息数）
  const totalTurns = conversation.messages.filter(m => m.type === 'user').length;

  return {
    totalTurns,
    totalDuration,
    toolUsage,
    tokenBreakdown: {
      totalInput,
      totalOutput,
      cacheCreation,
      cacheRead,
      cacheHitRate,
    },
    fileOperations,
    perTurnTokens,
  };
}
