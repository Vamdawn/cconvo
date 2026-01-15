import { homedir } from 'os';
import { join } from 'path';

// Claude数据目录
export const CLAUDE_DIR = join(homedir(), '.claude');
export const PROJECTS_DIR = join(CLAUDE_DIR, 'projects');
export const HISTORY_FILE = join(CLAUDE_DIR, 'history.jsonl');

// 将编码路径解码为原始路径
// 例如: -Users-chen-Repository-cc-exporter -> /Users/chen/Repository/cc-exporter
export function decodePath(encodedPath: string): string {
  // 移除开头的连字符，然后用/替换所有连字符
  return '/' + encodedPath.slice(1).replace(/-/g, '/');
}

// 将原始路径编码为目录名
// 例如: /Users/chen/Repository/cc-exporter -> -Users-chen-Repository-cc-exporter
export function encodePath(originalPath: string): string {
  return originalPath.replace(/\//g, '-');
}

// 从编码路径中提取项目名称（最后一段）
export function getProjectName(encodedPath: string): string {
  const originalPath = decodePath(encodedPath);
  const parts = originalPath.split('/').filter(Boolean);
  return parts[parts.length - 1] || encodedPath;
}

// 判断是否为JSONL文件
export function isJsonlFile(filename: string): boolean {
  return filename.endsWith('.jsonl');
}

// 判断是否为UUID格式
export function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// 从文件名提取sessionId
export function extractSessionId(filename: string): string | null {
  const name = filename.replace('.jsonl', '');
  return isUUID(name) ? name : null;
}
