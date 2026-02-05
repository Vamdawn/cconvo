import { createReadStream } from 'fs';
import { readdir } from 'fs/promises';
import { createInterface } from 'readline';
import { join } from 'path';
import type {
  MessageRecord,
  Conversation,
  SubagentConversation,
  TokenUsage,
  UserMessage,
  AssistantMessage,
} from '../models/types.js';
import { cleanUserInput, isRealUserInput, extractUserText } from '../utils/noise-filter.js';

// 对话元数据
interface ConversationMeta {
  slug?: string;
  startTime: Date;
  endTime: Date;
  messageCount: number;
  // 新增字段
  totalTokens: TokenUsage;
  firstUserMessage?: string;
}

// 解析对话文件元数据（快速扫描）
export async function parseConversationMeta(filePath: string): Promise<ConversationMeta> {
  let slug: string | undefined;
  let startTime: Date | undefined;
  let endTime: Date | undefined;
  let messageCount = 0;
  let firstUserMessage: string | undefined;
  const totalTokens: TokenUsage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  };

  const fileStream = createReadStream(filePath);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const record = JSON.parse(line) as MessageRecord;
      messageCount++;

      if (record.type === 'user') {
        const userMsg = record as UserMessage;
        const timestamp = new Date(userMsg.timestamp);

        if (!startTime || timestamp < startTime) {
          startTime = timestamp;
        }
        if (!endTime || timestamp > endTime) {
          endTime = timestamp;
        }

        // 从用户消息中提取slug
        if (userMsg.slug && !slug) {
          slug = userMsg.slug;
        }

        // 提取第一条真正的用户消息（过滤噪音和工具结果）
        if (!firstUserMessage && isRealUserInput(userMsg)) {
          const rawText = extractUserText(userMsg);
          const cleaned = cleanUserInput(rawText);
          if (cleaned) {
            firstUserMessage = cleaned.length > 100
              ? cleaned.slice(0, 100) + '...'
              : cleaned;
          }
        }
      }

      if (record.type === 'assistant') {
        const assistantMsg = record as AssistantMessage;
        const timestamp = new Date(assistantMsg.timestamp);

        if (!startTime || timestamp < startTime) {
          startTime = timestamp;
        }
        if (!endTime || timestamp > endTime) {
          endTime = timestamp;
        }

        // 累计 token 使用
        if (assistantMsg.message?.usage) {
          const usage = assistantMsg.message.usage;
          totalTokens.input_tokens += usage.input_tokens || 0;
          totalTokens.output_tokens += usage.output_tokens || 0;
          totalTokens.cache_creation_input_tokens! += usage.cache_creation_input_tokens || 0;
          totalTokens.cache_read_input_tokens! += usage.cache_read_input_tokens || 0;
        }
      }
    } catch {
      // 跳过无效行
    }
  }

  return {
    slug,
    startTime: startTime || new Date(),
    endTime: endTime || new Date(),
    messageCount,
    totalTokens,
    firstUserMessage,
  };
}

// 解析完整对话
export async function parseConversation(filePath: string, projectPath: string): Promise<Conversation> {
  const messages: MessageRecord[] = [];
  let slug: string | undefined;
  let sessionId: string | undefined;
  let startTime: Date | undefined;
  let endTime: Date | undefined;
  const totalTokens: TokenUsage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  };

  const fileStream = createReadStream(filePath);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const record = JSON.parse(line) as MessageRecord;
      messages.push(record);

      if (record.type === 'user') {
        const userMsg = record as UserMessage;
        const timestamp = new Date(userMsg.timestamp);

        if (!startTime || timestamp < startTime) startTime = timestamp;
        if (!endTime || timestamp > endTime) endTime = timestamp;

        if (userMsg.slug && !slug) slug = userMsg.slug;
        if (userMsg.sessionId && !sessionId) sessionId = userMsg.sessionId;
      }

      if (record.type === 'assistant') {
        const assistantMsg = record as AssistantMessage;
        const timestamp = new Date(assistantMsg.timestamp);

        if (!startTime || timestamp < startTime) startTime = timestamp;
        if (!endTime || timestamp > endTime) endTime = timestamp;

        // 累计token使用
        if (assistantMsg.message?.usage) {
          const usage = assistantMsg.message.usage;
          totalTokens.input_tokens += usage.input_tokens || 0;
          totalTokens.output_tokens += usage.output_tokens || 0;
          totalTokens.cache_creation_input_tokens! += usage.cache_creation_input_tokens || 0;
          totalTokens.cache_read_input_tokens! += usage.cache_read_input_tokens || 0;
        }
      }
    } catch {
      // 跳过无效行
    }
  }

  // 解析子代理对话
  const subagents = await parseSubagents(filePath, sessionId);

  return {
    sessionId: sessionId || '',
    slug,
    projectPath,
    filePath,
    messages,
    subagents,
    startTime: startTime || new Date(),
    endTime: endTime || new Date(),
    messageCount: messages.length,
    totalTokens,
  };
}

// 解析子代理对话
async function parseSubagents(mainFilePath: string, sessionId?: string): Promise<SubagentConversation[]> {
  if (!sessionId) return [];

  const subagentsDir = join(mainFilePath.replace('.jsonl', ''), 'subagents');
  const subagents: SubagentConversation[] = [];

  try {
    const entries = await readdir(subagentsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        const agentId = entry.name.replace('agent-', '').replace('.jsonl', '');
        const subagentPath = join(subagentsDir, entry.name);
        const messages = await parseSubagentMessages(subagentPath);

        subagents.push({
          agentId,
          filePath: subagentPath,
          messages,
          messageCount: messages.length,
        });
      }
    }
  } catch {
    // 没有子代理目录
  }

  return subagents;
}

// 解析子代理消息
async function parseSubagentMessages(filePath: string): Promise<MessageRecord[]> {
  const messages: MessageRecord[] = [];

  const fileStream = createReadStream(filePath);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const record = JSON.parse(line) as MessageRecord;
      messages.push(record);
    } catch {
      // 跳过无效行
    }
  }

  return messages;
}

// 构建消息树（按parentUuid关联）
export function buildMessageTree(messages: MessageRecord[]): MessageRecord[] {
  // 过滤出user和assistant消息，并按时间排序
  return messages
    .filter(m => m.type === 'user' || m.type === 'assistant')
    .sort((a, b) => {
      const timeA = new Date((a as UserMessage | AssistantMessage).timestamp).getTime();
      const timeB = new Date((b as UserMessage | AssistantMessage).timestamp).getTime();
      return timeA - timeB;
    });
}
