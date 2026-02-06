import type { UserMessage, ContentBlock } from '../models/types.js';

// 需要过滤的噪音模式
const NOISE_PATTERNS = [
  /^\[Request interrupted/,
  /^<local-command-caveat>/,
  /^<local-command-stdout>/,
  /^<bash-input>/,
  /^<bash-stdout>/,
  /^<bash-stderr>/,
  /^<user-prompt-submit-hook>/,
  /^<system-reminder>/,
];

// 判断内容是否为噪音
export function isNoiseContent(text: string): boolean {
  const trimmed = text.trim();
  return NOISE_PATTERNS.some(pattern => pattern.test(trimmed));
}

// 判断内容是否为 Skill 加载内容
export function isSkillLoading(text: string): boolean {
  return text.includes('Base directory for this skill:');
}

// 从 Skill 加载内容中提取触发命令
export function extractSkillTrigger(text: string): string | null {
  if (!isSkillLoading(text)) return null;

  const lines = text.trim().split('\n');
  if (lines.length >= 1) {
    const firstLine = lines[0];
    if (firstLine.includes('Base directory for this skill:')) {
      const path = firstLine.split(':').pop()?.trim() || '';
      const skillName = path.replace(/\/$/, '').split('/').pop();
      return skillName ? `/${skillName}` : null;
    }
  }
  return null;
}

// 从 command 标签中提取实际命令
export function extractCommand(text: string): string | null {
  // 优先从 command-name 提取
  const nameMatch = text.match(/<command-name>([^<]+)<\/command-name>/);
  if (nameMatch) {
    return nameMatch[1].trim();
  }

  // 备选：从 command-message 提取
  const msgMatch = text.match(/<command-message>([^<]+)<\/command-message>/);
  if (msgMatch) {
    const cmd = msgMatch[1].trim();
    return cmd.startsWith('/') ? cmd : `/${cmd}`;
  }

  return null;
}

// 清理用户输入，移除系统标签
export function cleanUserInput(text: string): string {
  let cleaned = text.trim();

  // 检查是否包含 command 标签
  if (cleaned.includes('<command-name>') || cleaned.includes('<command-message>')) {
    const cmd = extractCommand(cleaned);
    if (cmd) return cmd;
  }

  // 检查是否为 Skill 加载内容
  if (isSkillLoading(cleaned)) {
    const trigger = extractSkillTrigger(cleaned);
    if (trigger) return trigger;
  }

  // 移除各类系统标签
  cleaned = cleaned.replace(/<local-command-caveat>[^<]*<\/local-command-caveat>/g, '');
  cleaned = cleaned.replace(/<local-command-stdout>[^<]*<\/local-command-stdout>/g, '');
  cleaned = cleaned.replace(/<command-name>[^<]*<\/command-name>/g, '');
  cleaned = cleaned.replace(/<command-message>[^<]*<\/command-message>/g, '');
  cleaned = cleaned.replace(/<command-args>[^<]*<\/command-args>/g, '');
  cleaned = cleaned.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '');

  return cleaned.trim();
}

// 判断是否为 slash 命令
export function isSlashCommand(text: string): boolean {
  const cleaned = cleanUserInput(text);
  return cleaned.startsWith('/') && cleaned.split(/\s+/).length === 1;
}

// 判断消息是否为真正的用户输入（非工具结果或噪音）
export function isRealUserInput(message: UserMessage): boolean {
  const content = message.message.content;

  // 字符串内容
  if (typeof content === 'string') {
    const text = content.trim();
    if (!text) return false;
    if (isNoiseContent(text)) return false;
    return true;
  }

  // 数组内容
  if (Array.isArray(content)) {
    for (const item of content) {
      if (typeof item === 'object' && item !== null) {
        const block = item as ContentBlock;
        // 如果包含 tool_result，则不是用户输入
        if (block.type === 'tool_result') return false;
        // 如果包含非空 text，检查是否为噪音
        if (block.type === 'text') {
          const text = (block as { text: string }).text.trim();
          if (text && !isNoiseContent(text)) return true;
        }
      }
    }
    return false;
  }

  return false;
}

// 提取用户消息的纯文本（过滤工具结果）
export function extractUserText(message: UserMessage): string {
  const content = message.message.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    const texts: string[] = [];
    for (const item of content) {
      if (typeof item === 'object' && item !== null) {
        const block = item as ContentBlock;
        if (block.type === 'text') {
          texts.push((block as { text: string }).text);
        }
      }
    }
    return texts.join('\n');
  }

  return '';
}

// 判断是否为 Compact Summary 消息
export function isCompactSummary(message: UserMessage): boolean {
  return message.isCompactSummary === true;
}

// 判断是否为 Task Notification 消息
export function isTaskNotification(message: UserMessage): boolean {
  const content = extractUserText(message);
  return content.trim().startsWith('<task-notification>');
}
