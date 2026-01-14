import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import {
  PROJECTS_DIR,
  decodePath,
  getProjectName,
  isJsonlFile,
  extractSessionId,
} from '../utils/path.js';
import type { Project, ConversationSummary, ScanResult } from '../models/types.js';
import { parseConversationMeta } from './parser.js';

// 扫描所有项目
export async function scanProjects(basePath: string = PROJECTS_DIR): Promise<ScanResult> {
  const projects: Project[] = [];
  let totalConversations = 0;
  let totalSize = 0;

  try {
    const entries = await readdir(basePath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const project = await scanProject(join(basePath, entry.name), entry.name);
        if (project.totalConversations > 0) {
          projects.push(project);
          totalConversations += project.totalConversations;
          totalSize += project.totalSize;
        }
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  // 按项目名排序
  projects.sort((a, b) => a.name.localeCompare(b.name));

  return {
    projects,
    totalConversations,
    totalSize,
  };
}

// 扫描单个项目
export async function scanProject(dirPath: string, encodedPath: string): Promise<Project> {
  const conversations: ConversationSummary[] = [];
  let totalSize = 0;

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && isJsonlFile(entry.name)) {
        const sessionId = extractSessionId(entry.name);
        if (sessionId) {
          const filePath = join(dirPath, entry.name);
          const fileStat = await stat(filePath);

          // 检查是否有subagents目录
          const subagentsDir = join(dirPath, sessionId, 'subagents');
          let hasSubagents = false;
          try {
            await stat(subagentsDir);
            hasSubagents = true;
          } catch {
            // 没有subagents目录
          }

          // 解析对话元数据
          const meta = await parseConversationMeta(filePath);

          conversations.push({
            sessionId,
            slug: meta.slug,
            filePath,
            startTime: meta.startTime,
            endTime: meta.endTime,
            messageCount: meta.messageCount,
            fileSize: fileStat.size,
            hasSubagents,
          });

          totalSize += fileStat.size;
        }
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  // 按时间倒序排列
  conversations.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

  return {
    name: getProjectName(encodedPath),
    encodedPath,
    originalPath: decodePath(encodedPath),
    dirPath,
    conversations,
    totalConversations: conversations.length,
    totalSize,
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

// 根据sessionId查找对话
export async function findConversation(
  sessionId: string,
  basePath: string = PROJECTS_DIR
): Promise<{ project: Project; conversation: ConversationSummary } | null> {
  const result = await scanProjects(basePath);

  for (const project of result.projects) {
    const conversation = project.conversations.find(c => c.sessionId === sessionId);
    if (conversation) {
      return { project, conversation };
    }
  }

  return null;
}
