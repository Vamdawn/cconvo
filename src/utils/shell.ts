// Shell 检测和补全安装工具

import * as fs from 'fs';
import * as path from 'path';
import type { ShellType } from '../completion.js';

// 补全初始化代码的标记
const COMPLETION_START = '# >>> cconvo completion >>>';
const COMPLETION_END = '# <<< cconvo completion <<<';

/**
 * 检测当前 Shell 类型
 */
export function detectShell(): ShellType {
  const shell = process.env.SHELL || '';
  const shellName = path.basename(shell);

  if (shellName === 'zsh') return 'zsh';
  if (shellName === 'fish') return 'fish';
  if (shellName === 'bash') return 'bash';

  // 检查环境变量
  if (process.env.ZSH_VERSION) return 'zsh';
  if (process.env.FISH_VERSION) return 'fish';
  if (process.env.BASH_VERSION) return 'bash';

  // 默认 bash
  return 'bash';
}

/**
 * 获取 Shell 配置文件路径
 */
export function getShellRcFile(shell: ShellType): string {
  const homeDir = process.env.HOME;
  if (!homeDir) {
    throw new Error('Cannot detect home directory');
  }

  switch (shell) {
    case 'bash': {
      // macOS 优先使用 .bash_profile，Linux 使用 .bashrc
      const bashProfile = path.join(homeDir, '.bash_profile');
      const bashrc = path.join(homeDir, '.bashrc');

      if (process.platform === 'darwin') {
        // macOS: 优先 .bash_profile
        if (fs.existsSync(bashProfile)) return bashProfile;
        if (fs.existsSync(bashrc)) return bashrc;
        return bashProfile;
      } else {
        // Linux: 优先 .bashrc
        if (fs.existsSync(bashrc)) return bashrc;
        if (fs.existsSync(bashProfile)) return bashProfile;
        return bashrc;
      }
    }
    case 'zsh':
      return path.join(homeDir, '.zshrc');
    case 'fish':
      return path.join(homeDir, '.config', 'fish', 'config.fish');
    default:
      throw new Error(`Unsupported shell: ${shell}`);
  }
}

/**
 * 检查补全是否已安装
 */
export function isCompletionInstalled(shell: ShellType): boolean {
  try {
    const rcFile = getShellRcFile(shell);
    if (!fs.existsSync(rcFile)) return false;

    const content = fs.readFileSync(rcFile, 'utf-8');
    return content.includes(COMPLETION_START);
  } catch {
    return false;
  }
}

/**
 * 生成补全初始化代码
 */
function generateInitCode(shell: ShellType): string {
  return `
${COMPLETION_START}
eval "$(cconvo completion ${shell})"
${COMPLETION_END}
`;
}

/**
 * 安装补全脚本
 */
export function installCompletion(shell: ShellType): { rcFile: string; backupFile: string | null } {
  const rcFile = getShellRcFile(shell);

  // 检查是否已安装
  if (isCompletionInstalled(shell)) {
    throw new Error('Shell completion is already installed');
  }

  // 确保目录存在
  const rcDir = path.dirname(rcFile);
  if (!fs.existsSync(rcDir)) {
    fs.mkdirSync(rcDir, { recursive: true });
  }

  // 备份原文件（如果存在）
  let backupFile: string | null = null;
  if (fs.existsSync(rcFile)) {
    backupFile = `${rcFile}.cconvo-backup-${Date.now()}`;
    fs.copyFileSync(rcFile, backupFile);
  }

  // 追加补全初始化代码
  const initCode = generateInitCode(shell);
  fs.appendFileSync(rcFile, initCode);

  return { rcFile, backupFile };
}

/**
 * 卸载补全脚本
 */
export function uninstallCompletion(shell: ShellType): { rcFile: string; removed: boolean } {
  const rcFile = getShellRcFile(shell);

  if (!fs.existsSync(rcFile)) {
    return { rcFile, removed: false };
  }

  let content = fs.readFileSync(rcFile, 'utf-8');

  // 检查是否安装了补全
  if (!content.includes(COMPLETION_START)) {
    return { rcFile, removed: false };
  }

  // 移除补全初始化代码
  const regex = new RegExp(
    `\\n?${escapeRegExp(COMPLETION_START)}[\\s\\S]*?${escapeRegExp(COMPLETION_END)}\\n?`,
    'g'
  );
  content = content.replace(regex, '\n');

  // 清理多余的空行
  content = content.replace(/\n{3,}/g, '\n\n');

  fs.writeFileSync(rcFile, content);

  return { rcFile, removed: true };
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
