// 基础消息类型
export type MessageType = 'user' | 'assistant' | 'file-history-snapshot' | 'summary';

// Token使用统计
export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

// 思考内容块
export interface ThinkingBlock {
  type: 'thinking';
  thinking: string;
  signature?: string;
}

// 文本内容块
export interface TextBlock {
  type: 'text';
  text: string;
}

// 工具使用内容块
export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

// 工具结果内容块
export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | ContentBlock[];
}

// 内容块类型
export type ContentBlock = ThinkingBlock | TextBlock | ToolUseBlock | ToolResultBlock;

// 用户消息内容
export interface UserMessageContent {
  role: 'user';
  content: string | ContentBlock[];
}

// 助手消息内容
export interface AssistantMessageContent {
  role: 'assistant';
  content: ContentBlock[];
  id?: string;
  model?: string;
  stop_reason?: string | null;
  type?: string;
  usage?: TokenUsage;
}

// 用户消息记录
export interface UserMessage {
  type: 'user';
  uuid: string;
  parentUuid: string | null;
  timestamp: string;
  sessionId: string;
  cwd: string;
  gitBranch?: string;
  slug?: string;
  version?: string;
  userType?: string;
  isSidechain: boolean;
  message: UserMessageContent;
  todos?: Todo[];
  thinkingMetadata?: {
    level: string;
    disabled: boolean;
    triggers: string[];
  };
}

// 助手消息记录
export interface AssistantMessage {
  type: 'assistant';
  uuid: string;
  parentUuid: string;
  timestamp: string;
  isSidechain: boolean;
  message: AssistantMessageContent;
  agentId?: string;
}

// 文件历史快照
export interface FileHistorySnapshot {
  type: 'file-history-snapshot';
  messageId: string;
  snapshot: {
    messageId: string;
    trackedFileBackups: Record<string, unknown>;
    timestamp: string;
  };
  isSnapshotUpdate: boolean;
}

// 摘要记录
export interface SummaryMessage {
  type: 'summary';
  uuid: string;
  parentUuid: string;
  timestamp: string;
  summary: string;
  leafUuid: string;
}

// Todo项
export interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm?: string;
}

// 所有消息记录类型
export type MessageRecord = UserMessage | AssistantMessage | FileHistorySnapshot | SummaryMessage;

// 对话会话
export interface Conversation {
  sessionId: string;
  slug?: string;
  projectPath: string;
  filePath: string;
  messages: MessageRecord[];
  subagents: SubagentConversation[];
  startTime: Date;
  endTime: Date;
  messageCount: number;
  totalTokens: TokenUsage;
}

// 子代理对话
export interface SubagentConversation {
  agentId: string;
  filePath: string;
  messages: MessageRecord[];
  messageCount: number;
}

// 项目信息
export interface Project {
  name: string;
  encodedPath: string;
  originalPath: string;
  dirPath: string;
  conversations: ConversationSummary[];
  totalConversations: number;
  totalSize: number;
  isDeleted: boolean; // 原始目录是否已删除
}

// 对话摘要（用于列表显示）
export interface ConversationSummary {
  sessionId: string;
  slug?: string;
  filePath: string;
  startTime: Date;
  endTime: Date;
  messageCount: number;
  fileSize: number;
  hasSubagents: boolean;
}

// 扫描结果
export interface ScanResult {
  projects: Project[];
  totalConversations: number;
  totalSize: number;
}

// 导出选项
export interface ExportOptions {
  format: 'markdown' | 'json' | 'html';
  includeThinking: boolean;
  includeToolCalls: boolean;
  includeSubagents: boolean;
  outputPath: string;
  verboseTools: boolean;  // 显示完整工具 JSON（仅 markdown 格式）
}

// 对话轮次（用于 Markdown 导出）
export interface ConversationTurn {
  turnNumber: number;
  timestamp: Date;
  userInput: string;
  assistantResponse: {
    text: string;
    thinkings: string[];
    toolCalls: {
      name: string;
      summary: string;
      input: Record<string, unknown>;
    }[];
  };
}

// 统计信息
export interface Stats {
  totalProjects: number;
  totalConversations: number;
  totalMessages: number;
  totalTokens: TokenUsage;
  projectStats: ProjectStats[];
}

export interface ProjectStats {
  name: string;
  conversationCount: number;
  messageCount: number;
  tokens: TokenUsage;
  size: number;
}
