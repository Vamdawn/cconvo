import type { ChatMessage, ConversationStats } from '../models/types.js';
import type { Language } from '../utils/i18n.js';
import { formatTokens, formatDuration } from '../utils/format.js';

// 对话轮次数据（预处理后）
export interface TurnData {
  turnNumber: number;
  timestamp: string;
  userInput: string;
  agentContent: string;
}

// Prompt 构建结果
export interface PromptData {
  messages: ChatMessage[];
}

// 语言指令
function languageInstruction(lang: Language): string {
  return lang === 'zh'
    ? '请使用中文输出所有分析结果。'
    : 'Please output all analysis results in English.';
}

// 构建时间线摘要 Prompt
export function buildTimelinePrompt(turns: TurnData[], lang: Language): PromptData {
  const system = `You are an expert at analyzing AI coding assistant conversation logs. Your task is to create a timeline summary of the conversation.

Rules:
- Preserve the user's input EXACTLY as-is (do not paraphrase or summarize user messages)
- Only summarize the Agent's actions: what it did (read files, edited code, ran commands), what it produced, key decisions
- Keep agent summaries concise (1-3 sentences per turn)
- Use the format specified below strictly
${languageInstruction(lang)}`;

  const turnsText = turns.map(t =>
    `### Turn ${t.turnNumber} [${t.timestamp}]\n**User:**\n${t.userInput}\n\n**Agent actions:**\n${t.agentContent}`
  ).join('\n\n---\n\n');

  const user = `Below is the conversation log. Create a timeline summary following this format for each turn:

### Turn N [timestamp]
**User:**
(exact user input, preserved as-is)

**Agent:**
(concise summary of what the agent did)

---

Conversation log:

${turnsText}`;

  return { messages: [{ role: 'system', content: system }, { role: 'user', content: user }] };
}

// 构建使用模式分析 Prompt
export function buildPatternsPrompt(stats: ConversationStats, lang: Language): PromptData {
  const system = `You are an expert at analyzing AI coding assistant usage patterns. Based on the provided statistics, generate actionable insights.

Rules:
- Focus on notable patterns, anomalies, and optimization opportunities
- Reference specific data points from the statistics
- Be concise and specific, avoid generic observations
- Generate 3-5 key insights
${languageInstruction(lang)}`;

  const statsText = `## Statistics

### Tool Usage
${stats.toolUsage.map(t => `- ${t.name}: ${t.count} calls (${t.percentage}%)`).join('\n')}

### Token Consumption
- Total Input: ${formatTokens(stats.tokenBreakdown.totalInput)}
- Total Output: ${formatTokens(stats.tokenBreakdown.totalOutput)}
- Cache Creation: ${formatTokens(stats.tokenBreakdown.cacheCreation)}
- Cache Read: ${formatTokens(stats.tokenBreakdown.cacheRead)}
- Cache Hit Rate: ${stats.tokenBreakdown.cacheHitRate.toFixed(1)}%

### File Operation Hotspots
${stats.fileOperations.map(f => `- ${f.file}: ${f.count} operations`).join('\n')}

### Duration
- Total: ${formatDuration(stats.totalDuration)}
- Turns: ${stats.totalTurns}

### Per-Turn Token Usage
${stats.perTurnTokens.map(t => `- Turn ${t.turn}: Input ${formatTokens(t.input)} / Output ${formatTokens(t.output)}`).join('\n')}`;

  return { messages: [{ role: 'system', content: system }, { role: 'user', content: statsText }] };
}

// 构建知识提取 Prompt
export function buildKnowledgePrompt(turns: TurnData[], lang: Language): PromptData {
  const system = `You are an expert at extracting structured knowledge from AI coding assistant conversations.

Extract three categories of knowledge:

1. **Code Changes**: Files created, modified, or deleted with brief descriptions
2. **Technical Decisions**: Key architectural or implementation decisions with reasoning
3. **Problems & Solutions**: Issues encountered and how they were resolved

Rules:
- Only include information explicitly present in the conversation
- Use tables for code changes
- Be specific about file paths and change descriptions
- If a category has no relevant content, state that explicitly
${languageInstruction(lang)}`;

  const turnsText = turns.map(t =>
    `### Turn ${t.turnNumber}\n**User:** ${t.userInput}\n**Agent:** ${t.agentContent}`
  ).join('\n\n');

  return { messages: [{ role: 'system', content: system }, { role: 'user', content: turnsText }] };
}

// 构建质量评估 Prompt
export function buildQualityPrompt(turns: TurnData[], stats: ConversationStats, lang: Language): PromptData {
  const system = `You are an expert at evaluating AI coding assistant performance.

Evaluate across three dimensions:
1. **Efficiency**: Did the agent take unnecessary steps? Were there redundant operations? Was token usage economical?
2. **Accuracy**: Were the agent's responses correct? Any misleading information? Code quality issues?
3. **Interaction Quality**: Did the agent understand user intent? Was execution appropriate? Could anything be done better?

Rules:
- For each dimension, list specific strengths and areas for improvement
- Reference specific turns/actions as evidence
- Do NOT give numerical scores or star ratings
- Be constructive and specific
${languageInstruction(lang)}`;

  const turnsText = turns.map(t =>
    `### Turn ${t.turnNumber} [${t.timestamp}]\n**User:** ${t.userInput}\n**Agent:** ${t.agentContent}`
  ).join('\n\n');

  const statsContext = `\n\n## Context Statistics\n- Tool calls: ${stats.toolUsage.map(t => `${t.name}(${t.count})`).join(', ')}\n- Tokens: Input ${formatTokens(stats.tokenBreakdown.totalInput)} / Output ${formatTokens(stats.tokenBreakdown.totalOutput)}\n- Cache hit rate: ${stats.tokenBreakdown.cacheHitRate.toFixed(1)}%`;

  return { messages: [{ role: 'system', content: system }, { role: 'user', content: turnsText + statsContext }] };
}
