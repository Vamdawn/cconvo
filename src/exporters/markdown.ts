import type {
  Conversation,
  MessageRecord,
  UserMessage,
  AssistantMessage,
  ExportOptions,
  ConversationTurn,
} from '../models/types.js';
import {
  formatDateTime,
  formatTokens,
  extractTextContent,
  extractThinking,
  extractToolCalls,
  getFenceForContent,
  summarizeToolCall,
} from '../utils/format.js';
import {
  isRealUserInput,
  cleanUserInput,
  extractUserText,
  isSkillLoading,
  isSlashCommand,
} from '../utils/noise-filter.js';

// 导出为Markdown格式
export function exportToMarkdown(conversation: Conversation, options: ExportOptions): string {
  const lines: string[] = [];

  // 按轮次分组消息
  const turns = groupMessagesByTurn(conversation.messages);
  const turnCount = turns.length;

  // 标题和元数据
  lines.push(`# ${conversation.slug || conversation.sessionId}`);
  lines.push('');
  lines.push(`> **Project**: ${conversation.projectPath}`);
  lines.push(`> **Session ID**: ${conversation.sessionId}`);
  lines.push(`> **Time**: ${formatDateTime(conversation.startTime)} - ${formatDateTime(conversation.endTime)}`);
  lines.push(`> **Messages**: ${conversation.messageCount} 条 (${turnCount} 轮对话)`);
  lines.push(`> **Tokens**: Input ${formatTokens(conversation.totalTokens.input_tokens)} / Output ${formatTokens(conversation.totalTokens.output_tokens)}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 按轮次输出对话
  for (const turn of turns) {
    lines.push(formatTurn(turn, options));
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

      const subTurns = groupMessagesByTurn(subagent.messages);
      for (const turn of subTurns) {
        lines.push(formatTurn(turn, options));
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

// 将消息按对话轮次分组
function groupMessagesByTurn(messages: MessageRecord[]): ConversationTurn[] {
  const turns: ConversationTurn[] = [];
  const userMessages = messages.filter(m => m.type === 'user') as UserMessage[];

  // 预处理：找出需要跳过的索引（slash 命令后紧跟 skill 加载）
  const skipIndices = new Set<number>();
  for (let idx = 0; idx < userMessages.length; idx++) {
    if (!isRealUserInput(userMessages[idx])) continue;

    const currText = extractUserText(userMessages[idx]);
    if (isSlashCommand(currText)) {
      // 检查下一条真实用户输入是否为 skill 加载
      for (let nextIdx = idx + 1; nextIdx < userMessages.length; nextIdx++) {
        if (isRealUserInput(userMessages[nextIdx])) {
          const nextText = extractUserText(userMessages[nextIdx]);
          if (isSkillLoading(nextText)) {
            skipIndices.add(idx);
          }
          break;
        }
      }
    }
  }

  let turnNumber = 0;
  let i = 0;

  while (i < messages.length) {
    const msg = messages[i];

    // 跳过非用户消息或非真实用户输入
    if (msg.type !== 'user' || !isRealUserInput(msg as UserMessage)) {
      i++;
      continue;
    }

    // 检查是否在跳过列表中
    const userMsgIndex = userMessages.indexOf(msg as UserMessage);
    if (skipIndices.has(userMsgIndex)) {
      i++;
      continue;
    }

    turnNumber++;
    const userMsg = msg as UserMessage;
    const userText = cleanUserInput(extractUserText(userMsg));

    // 收集后续的 assistant 响应
    i++;
    const assistantTexts: string[] = [];
    const thinkings: string[] = [];
    const toolCalls: { name: string; summary: string; input: Record<string, unknown> }[] = [];

    while (i < messages.length) {
      const nextMsg = messages[i];

      // 遇到下一条真实用户输入时停止
      if (nextMsg.type === 'user' && isRealUserInput(nextMsg as UserMessage)) {
        break;
      }

      if (nextMsg.type === 'assistant') {
        const assistantMsg = nextMsg as AssistantMessage;
        const text = extractTextContent(assistantMsg);
        if (text) {
          assistantTexts.push(text);
        }
        thinkings.push(...extractThinking(assistantMsg));
        const tools = extractToolCalls(assistantMsg);
        toolCalls.push(...tools.map(summarizeToolCall));
      }

      i++;
    }

    turns.push({
      turnNumber,
      timestamp: new Date(userMsg.timestamp),
      userInput: userText,
      assistantResponse: {
        text: assistantTexts.join('\n\n'),
        thinkings,
        toolCalls,
      },
    });
  }

  return turns;
}

// 格式化单轮对话
function formatTurn(turn: ConversationTurn, options: ExportOptions): string {
  const lines: string[] = [];
  const timestamp = formatDateTime(turn.timestamp);

  lines.push(`## 对话 ${turn.turnNumber} (${timestamp})`);
  lines.push('');

  // 用户输入
  lines.push('### 用户输入');
  lines.push('');
  if (turn.userInput) {
    lines.push(turn.userInput);
  } else {
    lines.push('*(空)*');
  }
  lines.push('');

  // Claude 响应
  lines.push('### Claude 响应');
  lines.push('');

  // 思考过程
  if (options.includeThinking && turn.assistantResponse.thinkings.length > 0) {
    lines.push('<details>');
    lines.push('<summary>Thinking</summary>');
    lines.push('');
    for (const thinking of turn.assistantResponse.thinkings) {
      const fence = getFenceForContent(thinking);
      lines.push(fence);
      lines.push(thinking);
      lines.push(fence);
      lines.push('');
    }
    lines.push('</details>');
    lines.push('');
  }

  // 工具调用
  if (options.includeToolCalls && turn.assistantResponse.toolCalls.length > 0) {
    if (options.verboseTools) {
      // 完整 JSON 模式
      for (const tool of turn.assistantResponse.toolCalls) {
        lines.push('<details>');
        lines.push(`<summary>Tool: ${tool.name}</summary>`);
        lines.push('');
        lines.push('```json');
        lines.push(JSON.stringify(tool.input, null, 2));
        lines.push('```');
        lines.push('</details>');
        lines.push('');
      }
    } else {
      // 摘要模式
      lines.push('**工具调用**:');
      for (const tool of turn.assistantResponse.toolCalls) {
        if (tool.summary) {
          lines.push(`- \`${tool.name}\`: ${tool.summary}`);
        } else {
          lines.push(`- \`${tool.name}\``);
        }
      }
      lines.push('');
    }
  }

  // 文本内容
  if (turn.assistantResponse.text) {
    lines.push(turn.assistantResponse.text);
  } else {
    lines.push('*(无文本回复)*');
  }
  lines.push('');
  lines.push('---');

  return lines.join('\n');
}
