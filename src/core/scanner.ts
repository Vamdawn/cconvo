import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import {
  PROJECTS_DIR,
  decodePathAsync,
  getProjectNameAsync,
  isJsonlFile,
  extractSessionId,
} from '../utils/path.js';
import type { Project, ConversationSummary, ScanResult, TokenUsage } from '../models/types.js';
import { parseConversationMeta } from './parser.js';
import { parallelLimit } from '../utils/async.js';
import {
  loadCache,
  saveCache,
  getCacheEntry,
  setCacheEntry,
} from '../utils/cache.js';

// session ID 前缀匹配最小长度
const MIN_PREFIX_LENGTH = 4;

/**
 * 当 session ID 前缀匹配到多个对话时抛出
 */
export class AmbiguousSessionIdError extends Error {
  constructor(
    public readonly prefix: string,
    public readonly matches: Array<{
      sessionId: string;
      projectName: string;
      startTime: Date;
    }>
  ) {
    super(`Ambiguous session ID prefix: ${prefix}`);
    this.name = 'AmbiguousSessionIdError';
  }
}

// 扫描所有项目
export async function scanProjects(basePath: string = PROJECTS_DIR): Promise<ScanResult> {
  // 加载缓存
  await loadCache();

  const projects: Project[] = [];
  let totalConversations = 0;
  let totalSize = 0;

  try {
    const entries = await readdir(basePath, { withFileTypes: true });

    // 筛选目录
    const directories = entries.filter(entry => entry.isDirectory());

    // 并行扫描项目（限制 10 并发）
    const projectResults = await parallelLimit(
      directories,
      10,
      (entry) => scanProject(join(basePath, entry.name), entry.name)
    );

    // 过滤有效项目并统计
    for (const project of projectResults) {
      if (project.totalConversations > 0) {
        projects.push(project);
        totalConversations += project.totalConversations;
        totalSize += project.totalSize;
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  // 按项目名排序
  projects.sort((a, b) => a.name.localeCompare(b.name));

  // 保存缓存
  await saveCache();

  return {
    projects,
    totalConversations,
    totalSize,
  };
}

// 检查是否有 subagents 目录
async function checkSubagents(dirPath: string, sessionId: string): Promise<boolean> {
  const subagentsDir = join(dirPath, sessionId, 'subagents');
  try {
    await stat(subagentsDir);
    return true;
  } catch {
    return false;
  }
}

// 扫描单个项目
export async function scanProject(dirPath: string, encodedPath: string): Promise<Project> {
  const conversations: ConversationSummary[] = [];
  let totalSize = 0;

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    // 筛选 jsonl 文件
    const jsonlEntries = entries.filter(
      (entry): entry is typeof entry & { name: string } =>
        entry.isFile() && isJsonlFile(entry.name)
    );

    // 并行处理对话文件（限制 20 并发）
    const conversationResults = await parallelLimit(
      jsonlEntries,
      20,
      async (entry) => {
        const sessionId = extractSessionId(entry.name);
        if (!sessionId) return null;

        const filePath = join(dirPath, entry.name);
        const fileStat = await stat(filePath);
        const mtime = fileStat.mtimeMs;

        // 尝试从缓存获取元数据
        let meta: {
          slug?: string;
          startTime: Date;
          endTime: Date;
          messageCount: number;
          totalTokens: TokenUsage;
          firstUserMessage?: string;
        };
        const cached = getCacheEntry(filePath, mtime);

        if (cached) {
          // 使用缓存
          meta = {
            slug: cached.slug,
            startTime: new Date(cached.startTime),
            endTime: new Date(cached.endTime),
            messageCount: cached.messageCount,
            totalTokens: cached.totalTokens || {
              input_tokens: 0,
              output_tokens: 0,
              cache_creation_input_tokens: 0,
              cache_read_input_tokens: 0,
            },
            firstUserMessage: cached.firstUserMessage,
          };
        } else {
          // 解析文件并更新缓存
          const parsed = await parseConversationMeta(filePath);
          meta = parsed;

          setCacheEntry(filePath, {
            mtime,
            slug: parsed.slug,
            startTime: parsed.startTime.toISOString(),
            endTime: parsed.endTime.toISOString(),
            messageCount: parsed.messageCount,
            totalTokens: parsed.totalTokens,
            firstUserMessage: parsed.firstUserMessage,
          });
        }

        // 检查 subagents
        const hasSubagents = await checkSubagents(dirPath, sessionId);

        return {
          sessionId,
          slug: meta.slug,
          filePath,
          startTime: meta.startTime,
          endTime: meta.endTime,
          messageCount: meta.messageCount,
          fileSize: fileStat.size,
          hasSubagents,
          // 新增字段
          duration: meta.endTime.getTime() - meta.startTime.getTime(),
          totalTokens: meta.totalTokens,
          firstUserMessage: meta.firstUserMessage,
        } as ConversationSummary;
      }
    );

    // 过滤无效结果并计算总大小
    for (const conv of conversationResults) {
      if (conv) {
        conversations.push(conv);
        totalSize += conv.fileSize;
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  // 按时间倒序排列
  conversations.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

  const decodeResult = await decodePathAsync(encodedPath);

  return {
    name: await getProjectNameAsync(encodedPath),
    encodedPath,
    originalPath: decodeResult.path,
    dirPath,
    conversations,
    totalConversations: conversations.length,
    totalSize,
    isDeleted: !decodeResult.exists,
  };
}

// 根据项目名称搜索项目
export async function findProject(name: string, basePath: string = PROJECTS_DIR): Promise<Project | null> {
  const result = await scanProjects(basePath);
  return result.projects.find(p =>
    p.name.toLowerCase().includes(name.toLowerCase()) ||
    p.originalPath.toLowerCase().includes(name.toLowerCase())
  ) || null;
}

// 根据 sessionId 或前缀查找对话
export async function findConversation(
  sessionIdOrPrefix: string,
  basePath: string = PROJECTS_DIR
): Promise<{ project: Project; conversation: ConversationSummary } | null> {
  // 检查最小长度
  if (sessionIdOrPrefix.length < MIN_PREFIX_LENGTH) {
    throw new Error(
      `Session ID prefix must be at least ${MIN_PREFIX_LENGTH} characters`
    );
  }

  const result = await scanProjects(basePath);
  const matches: Array<{
    project: Project;
    conversation: ConversationSummary;
  }> = [];

  // 收集所有前缀匹配的对话
  for (const project of result.projects) {
    for (const conversation of project.conversations) {
      if (conversation.sessionId.startsWith(sessionIdOrPrefix)) {
        matches.push({ project, conversation });
      }
    }
  }

  // 根据匹配数量返回结果
  if (matches.length === 0) {
    return null;
  }

  if (matches.length === 1) {
    return matches[0];
  }

  // 多个匹配，抛出歧义错误
  throw new AmbiguousSessionIdError(
    sessionIdOrPrefix,
    matches.map(m => ({
      sessionId: m.conversation.sessionId,
      projectName: m.project.name,
      startTime: m.conversation.startTime,
    }))
  );
}

// 根据路径查找项目（用于当前目录检测）
export async function findProjectByPath(
  targetPath: string,
  basePath: string = PROJECTS_DIR
): Promise<Project | null> {
  const result = await scanProjects(basePath);

  // 规范化目标路径（去除末尾斜杠）
  const normalizedTarget = targetPath.replace(/\/+$/, '');

  for (const project of result.projects) {
    // 规范化项目路径
    const normalizedProject = project.originalPath.replace(/\/+$/, '');

    // 精确匹配或目标路径是项目路径的子目录
    if (normalizedTarget === normalizedProject ||
        normalizedTarget.startsWith(normalizedProject + '/')) {
      return project;
    }
  }

  return null;
}
