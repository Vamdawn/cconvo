import { homedir } from 'os';
import { join } from 'path';
import { stat } from 'fs/promises';

// Claude数据目录
export const CLAUDE_DIR = join(homedir(), '.claude');
export const PROJECTS_DIR = join(CLAUDE_DIR, 'projects');
export const HISTORY_FILE = join(CLAUDE_DIR, 'history.jsonl');

// 路径存在性缓存（模块级别，程序运行期间有效）
const pathExistsCache = new Map<string, boolean>();

// 带缓存的路径存在性检查
async function pathExists(path: string): Promise<boolean> {
  if (pathExistsCache.has(path)) {
    return pathExistsCache.get(path)!;
  }

  try {
    await stat(path);
    pathExistsCache.set(path, true);
    return true;
  } catch {
    pathExistsCache.set(path, false);
    return false;
  }
}

// 将编码路径解码为原始路径（同步版本，简单替换）
// 例如: -Users-chen-Repository-cc-exporter -> /Users/chen/Repository/cc-exporter
// 注意：此函数无法正确处理路径中包含 - 的情况，仅作为回退使用
export function decodePath(encodedPath: string): string {
  return '/' + encodedPath.slice(1).replace(/-/g, '/');
}

// 路径解码结果
export interface DecodePathResult {
  path: string;
  exists: boolean; // 是否找到有效路径
}

// 将编码路径解码为原始路径（异步版本，通过检查文件系统正确还原）
// 使用正向递归+回溯算法，处理路径中包含 - 的情况
export async function decodePathAsync(encodedPath: string): Promise<DecodePathResult> {
  const parts = encodedPath.slice(1).split('-');

  // 递归尝试解码
  async function tryDecode(startIdx: number, currentPath: string): Promise<string | null> {
    // 所有部分都已处理
    if (startIdx >= parts.length) {
      return currentPath;
    }

    // 从 startIdx 开始，尝试不同长度的段
    let segment = '';
    for (let i = startIdx; i < parts.length; i++) {
      segment = segment ? segment + '-' + parts[i] : parts[i];
      const testPath = currentPath + '/' + segment;

      // 检查路径是否存在
      if (await pathExists(testPath)) {
        // 如果是最后一部分，直接返回
        if (i === parts.length - 1) {
          return testPath;
        }
        // 递归处理剩余部分
        const result = await tryDecode(i + 1, testPath);
        if (result) return result;
        // 回溯：继续尝试更长的段
      }
    }
    return null;
  }

  const result = await tryDecode(0, '');
  if (result) {
    return { path: result, exists: true };
  }
  // 如果找不到存在的路径，回退到简单解码
  return { path: decodePath(encodedPath), exists: false };
}

// 将原始路径编码为目录名
// 例如: /Users/chen/Repository/cc-exporter -> -Users-chen-Repository-cc-exporter
export function encodePath(originalPath: string): string {
  return originalPath.replace(/\//g, '-');
}

// 从编码路径中提取项目名称（同步版本）
export function getProjectName(encodedPath: string): string {
  const originalPath = decodePath(encodedPath);
  const parts = originalPath.split('/').filter(Boolean);
  return parts[parts.length - 1] || encodedPath;
}

// 从编码路径中提取项目名称（异步版本，正确处理包含 - 的路径）
export async function getProjectNameAsync(encodedPath: string): Promise<string> {
  const result = await decodePathAsync(encodedPath);
  const parts = result.path.split('/').filter(Boolean);
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
