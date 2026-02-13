import type {
  Conversation,
  ConversationStats,
  AnalysisResult,
  LLMProvider,
  UserMessage,
} from '../models/types.js';
import type { Language } from '../utils/i18n.js';
import { t } from '../utils/i18n.js';
import type { TurnData } from './prompts.js';
import { extractTextContent, extractToolCalls, summarizeToolCall, formatDateTime, formatTokens, truncate } from '../utils/format.js';
import { isRealUserInput, cleanUserInput, extractUserText } from '../utils/noise-filter.js';
import { computeStats } from './stats.js';
import { buildTimelinePrompt, buildPatternsPrompt, buildKnowledgePrompt, buildQualityPrompt } from './prompts.js';
import { chatCompletion, chatCompletionStream } from './client.js';

// 最大工具结果长度
const MAX_TOOL_RESULT_LENGTH = 100;

// 从会话中提取对话轮次数据
export function prepareTurns(conversation: Conversation): TurnData[] {
  const turns: TurnData[] = [];
  const messages = conversation.messages;
  let turnNumber = 0;
  let i = 0;

  while (i < messages.length) {
    const msg = messages[i];

    // 跳过非用户消息或非真实用户输入
    if (msg.type !== 'user' || !isRealUserInput(msg as UserMessage)) {
      i++;
      continue;
    }

    turnNumber++;
    const userMsg = msg as UserMessage;
    const userText = cleanUserInput(extractUserText(userMsg));
    const timestamp = formatDateTime(new Date(userMsg.timestamp));

    // 收集后续 assistant 响应
    i++;
    const agentParts: string[] = [];

    while (i < messages.length) {
      const nextMsg = messages[i];

      // 遇到下一条真实用户输入时停止
      if (nextMsg.type === 'user' && isRealUserInput(nextMsg as UserMessage)) {
        break;
      }

      if (nextMsg.type === 'assistant') {
        // 文本内容
        const text = extractTextContent(nextMsg);
        if (text) {
          agentParts.push(text);
        }

        // 工具调用摘要
        const tools = extractToolCalls(nextMsg);
        for (const tool of tools) {
          const summary = summarizeToolCall(tool);
          agentParts.push(`[Tool: ${summary.name}] ${truncate(summary.summary, MAX_TOOL_RESULT_LENGTH)}`);
        }
      }

      i++;
    }

    turns.push({
      turnNumber,
      timestamp,
      userInput: userText,
      agentContent: agentParts.join('\n'),
    });
  }

  return turns;
}

// 执行完整分析
export async function analyzeConversation(
  conversation: Conversation,
  provider: LLMProvider,
  lang: Language,
  onProgress?: (phase: string, chunk: string) => void
): Promise<AnalysisResult> {
  // 本地统计
  const stats = computeStats(conversation);

  // 预处理轮次数据
  const turns = prepareTurns(conversation);

  // 流式回调包装
  const streamOrComplete = async (
    phase: string,
    promptData: { messages: { role: 'system' | 'user' | 'assistant'; content: string }[] }
  ): Promise<string> => {
    if (onProgress) {
      return chatCompletionStream(provider, promptData, (chunk: string) => {
        onProgress(phase, chunk);
      });
    }
    return chatCompletion(provider, promptData);
  };

  // 依次执行四项分析
  const timeline = await streamOrComplete('timeline', buildTimelinePrompt(turns, lang));
  const patterns = await streamOrComplete('patterns', buildPatternsPrompt(stats, lang));
  const knowledge = await streamOrComplete('knowledge', buildKnowledgePrompt(turns, lang));
  const quality = await streamOrComplete('quality', buildQualityPrompt(turns, stats, lang));

  return {
    timeline,
    patterns,
    knowledge,
    quality,
    stats,
  };
}

// 格式化分析结果为 Markdown
export function formatAnalysisResult(
  result: AnalysisResult,
  conversation: Conversation,
  lang: Language
): string {
  const lines: string[] = [];

  // 标题
  lines.push(`# ${t('analysis', lang)} - ${conversation.slug || conversation.sessionId}`);
  lines.push('');
  lines.push(`> **Session**: ${conversation.sessionId}`);
  lines.push(`> **Time**: ${formatDateTime(conversation.startTime)} - ${formatDateTime(conversation.endTime)}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 时间线摘要
  lines.push(`## ${t('analysisTimeline', lang)}`);
  lines.push('');
  lines.push(result.timeline);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 使用模式分析
  lines.push(`## ${t('analysisPatterns', lang)}`);
  lines.push('');
  lines.push(formatStatsSection(result.stats, lang));
  lines.push('');
  lines.push(`### ${t('analysisInsights', lang)}`);
  lines.push('');
  lines.push(result.patterns);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 知识提取
  lines.push(`## ${t('analysisKnowledge', lang)}`);
  lines.push('');
  lines.push(result.knowledge);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 质量评估
  lines.push(`## ${t('analysisQuality', lang)}`);
  lines.push('');
  lines.push(result.quality);

  return lines.join('\n');
}

// 格式化统计数据段
function formatStatsSection(
  stats: ConversationStats,
  lang: Language
): string {
  const lines: string[] = [];

  // 工具使用统计表
  lines.push(`### ${t('analysisToolStats', lang)}`);
  lines.push('');
  lines.push(`| ${t('statsTool', lang)} | ${t('statsCount', lang)} | ${t('statsPercentage', lang)} |`);
  lines.push('|------|------|------|');
  for (const tool of stats.toolUsage) {
    lines.push(`| ${tool.name} | ${tool.count} | ${tool.percentage}% |`);
  }
  lines.push('');

  // Token 消耗
  lines.push(`### ${t('analysisTokenStats', lang)}`);
  lines.push('');
  lines.push(`- ${t('statsTotalInput', lang)}: ${formatTokens(stats.tokenBreakdown.totalInput)}`);
  lines.push(`- ${t('statsTotalOutput', lang)}: ${formatTokens(stats.tokenBreakdown.totalOutput)}`);
  lines.push(`- ${t('statsCacheHitRate', lang)}: ${stats.tokenBreakdown.cacheHitRate.toFixed(1)}%`);
  lines.push('');

  // 文件操作热点
  if (stats.fileOperations.length > 0) {
    lines.push(`### ${t('analysisFileHotspot', lang)}`);
    lines.push('');
    lines.push(`| ${t('statsFile', lang)} | ${t('statsOperations', lang)} |`);
    lines.push('|------|------|');
    for (const file of stats.fileOperations) {
      lines.push(`| ${file.file} | ${file.count} |`);
    }
  }

  return lines.join('\n');
}
