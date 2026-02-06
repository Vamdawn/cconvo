import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { vol } from 'memfs';

// Mock fs/promises
vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

// 在 mock 之后导入被测模块
const { loadCache, saveCache, getCacheEntry, setCacheEntry } = await import(
  '../../src/utils/cache.js'
);

describe('cache', () => {
  beforeEach(() => {
    vol.reset();
    // 创建 home 目录
    vol.mkdirSync('/Users/test', { recursive: true });
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('getCacheEntry / setCacheEntry', () => {
    it('应在缓存未加载时返回 null', () => {
      expect(getCacheEntry('/path/to/file.jsonl', 12345)).toBe(null);
    });
  });

  describe('缓存条目操作', () => {
    it('应设置并获取缓存条目', async () => {
      const entry = {
        mtime: 12345,
        slug: 'test-slug',
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T11:00:00Z',
        messageCount: 10,
        totalTokens: {
          input_tokens: 1000,
          output_tokens: 500,
        },
      };

      setCacheEntry('/path/to/file.jsonl', entry);

      // 相同 mtime 应命中缓存
      const cached = getCacheEntry('/path/to/file.jsonl', 12345);
      expect(cached).toEqual(entry);

      // 不同 mtime 应返回 null
      expect(getCacheEntry('/path/to/file.jsonl', 99999)).toBe(null);
    });
  });
});
