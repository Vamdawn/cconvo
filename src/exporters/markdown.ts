import type {
  Conversation,
  MessageRecord,
  UserMessage,
  AssistantMessage,
  ExportOptions,
  ConversationTurn,
  UserInputType,
} from '../models/types.js';
import {
  formatDateTime,
  formatTokens,
  extractTextContent,
  extractThinking,
  extractToolCalls,
  getFenceForContent,
  summarizeToolCall,
  parseTaskNotification,
  formatTaskNotification,
} from '../utils/format.js';
import {
  isRealUserInput,
  cleanUserInput,
  extractUserText,
  isSkillLoading,
  isSlashCommand,
  isCompactSummary,
  isTaskNotification,
} from '../utils/noise-filter.js';
import { t, type Language } from '../utils/i18n.js';

// 导出为Markdown格式
export function exportToMarkdown(conversation: Conversation, options: ExportOptions): string {
  const lines: string[] = [];
  const lang = options.language || 'en';

  // 按轮次分组消息
  const turns = groupMessagesByTurn(conversation.messages);
  const turnCount = turns.length;

  // 标题和元数据
  lines.push(`# ${conversation.slug || conversation.sessionId}`);
  lines.push('');
  lines.push(`> **Project**: ${conversation.projectPath}`);
  lines.push(`> **Session ID**: ${conversation.sessionId}`);
  lines.push(`> **Time**: ${formatDateTime(conversation.startTime)} - ${formatDateTime(conversation.endTime)}`);
  lines.push(`> **Messages**: ${conversation.messageCount} ${t('messages', lang)} (${turnCount} ${t('turns', lang)})`);
  lines.push(`> **Tokens**: Input ${formatTokens(conversation.totalTokens.input_tokens)} / Output ${formatTokens(conversation.totalTokens.output_tokens)}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 按轮次输出对话
  for (const turn of turns) {
    lines.push(formatTurn(turn, options, lang));
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
        lines.push(formatTurn(turn, options, lang));
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

    // 检测用户输入类型
    let userInputType: UserInputType = 'normal';
    if (isCompactSummary(userMsg)) {
      userInputType = 'compacted';
    } else if (isTaskNotification(userMsg)) {
      userInputType = 'agent';
    }

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
      userInputType,
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
function formatTurn(turn: ConversationTurn, options: ExportOptions, lang: Language): string {
  const lines: string[] = [];
  const timestamp = formatDateTime(turn.timestamp);

  lines.push(`## ${t('turn', lang)} ${turn.turnNumber} (${timestamp})`);
  lines.push('');

  // 用户输入（带类型标注）
  let userInputLabel = t('userInput', lang);
  if (turn.userInputType === 'compacted') {
    userInputLabel += ` [${t('compacted', lang)}]`;
  } else if (turn.userInputType === 'agent') {
    userInputLabel += ` [${t('agent', lang)}]`;
  }
  lines.push(`### ${userInputLabel}`);
  lines.push('');
  if (turn.userInput) {
    // Task Notification 使用格式化输出
    if (turn.userInputType === 'agent') {
      const taskData = parseTaskNotification(turn.userInput);
      if (taskData) {
        lines.push(formatTaskNotification(taskData, lang));
      } else {
        // 解析失败时回退到原始内容
        lines.push(getFenceForContent(turn.userInput, 'markdown'));
        lines.push(turn.userInput);
        lines.push(getFenceForContent(turn.userInput));
      }
    } else {
      // 普通消息和 Compact Summary 保持原样
      lines.push(getFenceForContent(turn.userInput, 'markdown'));
      lines.push(turn.userInput);
      lines.push(getFenceForContent(turn.userInput));
    }
  } else {
    lines.push(t('emptyInput', lang));
  }
  lines.push('');

  // Claude 响应
  lines.push(`### ${t('claudeResponse', lang)}`);
  lines.push('');

  // 思考过程
  if (options.includeThinking && turn.assistantResponse.thinkings.length > 0) {
    lines.push('<details>');
    lines.push(`<summary>${t('thinking', lang)}</summary>`);
    lines.push('');
    for (const thinking of turn.assistantResponse.thinkings) {
      lines.push(getFenceForContent(thinking, 'markdown'));
      lines.push(thinking);
      lines.push(getFenceForContent(thinking));
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
        lines.push(`<summary>${t('tool', lang)}: ${tool.name}</summary>`);
        lines.push('');
        lines.push('```json');
        lines.push(JSON.stringify(tool.input, null, 2));
        lines.push('```');
        lines.push('</details>');
        lines.push('');
      }
    } else {
      // 摘要模式
      lines.push('<details>');
      lines.push(`<summary>${t('toolCalls', lang)}</summary>`);
      lines.push('');
      for (const tool of turn.assistantResponse.toolCalls) {
        if (tool.summary) {
          lines.push(`- \`${tool.name}\`: ${tool.summary}`);
        } else {
          lines.push(`- \`${tool.name}\``);
        }
      }
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }
  }

  // 文本内容
  if (turn.assistantResponse.text) {
    lines.push(getFenceForContent(turn.assistantResponse.text, 'markdown'));
    lines.push(turn.assistantResponse.text);
    lines.push(getFenceForContent(turn.assistantResponse.text));
  }

  // 如果完全没有输出（无 thinking、tool calls、text），显示提示
  const hasThinking = options.includeThinking && turn.assistantResponse.thinkings.length > 0;
  const hasToolCalls = options.includeToolCalls && turn.assistantResponse.toolCalls.length > 0;
  const hasText = !!turn.assistantResponse.text;
  if (!hasThinking && !hasToolCalls && !hasText) {
    lines.push(t('noOutput', lang));
  }

  lines.push('');
  lines.push('---');

  return lines.join('\n');
}
