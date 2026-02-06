import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { vol } from 'memfs';

// Mock fs 模块
vi.mock('fs', async () => {
  const memfs = await import('memfs');
  return memfs.fs;
});

vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

// Mock os.homedir
vi.mock('os', () => ({
  homedir: () => '/Users/test',
}));

// 在 mock 之后导入被测模块
const { AmbiguousSessionIdError } = await import('../../src/core/scanner.js');

describe('scanner', () => {
  beforeEach(() => {
    vol.reset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('AmbiguousSessionIdError', () => {
    it('应创建带匹配列表的错误', () => {
      const matches = [
        { sessionId: 'abc-123', projectName: 'project1', startTime: new Date() },
        { sessionId: 'abc-456', projectName: 'project2', startTime: new Date() },
      ];

      const error = new AmbiguousSessionIdError('abc', matches);

      expect(error.name).toBe('AmbiguousSessionIdError');
      expect(error.prefix).toBe('abc');
      expect(error.matches).toHaveLength(2);
      expect(error.message).toContain('abc');
    });
  });

  // 注意：scanProjects 和 findConversation 等函数依赖复杂的文件系统结构
  // 以及缓存机制，完整测试需要更复杂的 mock 设置
  // 这里仅测试错误类和基本导出
});
