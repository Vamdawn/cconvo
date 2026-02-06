import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { vol } from 'memfs';

// Mock fs
vi.mock('fs', async () => {
  const memfs = await import('memfs');
  return memfs.fs;
});

vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

// 在 mock 之后导入被测模块
const { parseConversationMeta, buildMessageTree } = await import(
  '../../src/core/parser.js'
);

describe('parser', () => {
  beforeEach(() => {
    vol.reset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('parseConversationMeta', () => {
    it('应解析标准 JSONL 对话文件', async () => {
      const jsonlContent = [
        JSON.stringify({
          type: 'user',
          timestamp: '2025-01-15T10:00:00Z',
          sessionId: 'test-session',
          slug: 'test-slug',
          message: { role: 'user', content: 'Hello' },
        }),
        JSON.stringify({
          type: 'assistant',
          timestamp: '2025-01-15T10:01:00Z',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'Hi there!' }],
            usage: { input_tokens: 100, output_tokens: 50 },
          },
        }),
      ].join('\n');

      vol.fromJSON({
        '/test/conversation.jsonl': jsonlContent,
      });

      const meta = await parseConversationMeta('/test/conversation.jsonl');

      expect(meta.messageCount).toBe(2);
      expect(meta.slug).toBe('test-slug');
      expect(meta.totalTokens.input_tokens).toBe(100);
      expect(meta.totalTokens.output_tokens).toBe(50);
    });

    it('应正确统计 Token 使用量', async () => {
      const jsonlContent = [
        JSON.stringify({
          type: 'assistant',
          timestamp: '2025-01-15T10:00:00Z',
          message: {
            role: 'assistant',
            content: [],
            usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 20 },
          },
        }),
        JSON.stringify({
          type: 'assistant',
          timestamp: '2025-01-15T10:01:00Z',
          message: {
            role: 'assistant',
            content: [],
            usage: { input_tokens: 200, output_tokens: 100, cache_creation_input_tokens: 30 },
          },
        }),
      ].join('\n');

      vol.fromJSON({
        '/test/conversation.jsonl': jsonlContent,
      });

      const meta = await parseConversationMeta('/test/conversation.jsonl');

      expect(meta.totalTokens.input_tokens).toBe(300);
      expect(meta.totalTokens.output_tokens).toBe(150);
      expect(meta.totalTokens.cache_read_input_tokens).toBe(20);
      expect(meta.totalTokens.cache_creation_input_tokens).toBe(30);
    });

    it('应处理空文件', async () => {
      vol.fromJSON({
        '/test/empty.jsonl': '',
      });

      const meta = await parseConversationMeta('/test/empty.jsonl');

      expect(meta.messageCount).toBe(0);
      expect(meta.totalTokens.input_tokens).toBe(0);
    });

    it('应跳过格式错误的 JSON 行', async () => {
      const jsonlContent = [
        JSON.stringify({
          type: 'user',
          timestamp: '2025-01-15T10:00:00Z',
          message: { role: 'user', content: 'Hello' },
        }),
        'invalid json line',
        JSON.stringify({
          type: 'assistant',
          timestamp: '2025-01-15T10:01:00Z',
          message: { role: 'assistant', content: [] },
        }),
      ].join('\n');

      vol.fromJSON({
        '/test/conversation.jsonl': jsonlContent,
      });

      const meta = await parseConversationMeta('/test/conversation.jsonl');

      // 应跳过无效行，只统计 2 条有效消息
      expect(meta.messageCount).toBe(2);
    });

    it('应提取第一条用户消息', async () => {
      const jsonlContent = [
        JSON.stringify({
          type: 'user',
          timestamp: '2025-01-15T10:00:00Z',
          message: { role: 'user', content: 'First message' },
        }),
        JSON.stringify({
          type: 'user',
          timestamp: '2025-01-15T10:02:00Z',
          message: { role: 'user', content: 'Second message' },
        }),
      ].join('\n');

      vol.fromJSON({
        '/test/conversation.jsonl': jsonlContent,
      });

      const meta = await parseConversationMeta('/test/conversation.jsonl');

      expect(meta.firstUserMessage).toBe('First message');
    });
  });

  describe('buildMessageTree', () => {
    it('应过滤并排序消息', () => {
      const messages = [
        {
          type: 'assistant' as const,
          timestamp: '2025-01-15T10:01:00Z',
          message: { role: 'assistant' as const, content: [] },
        },
        {
          type: 'user' as const,
          timestamp: '2025-01-15T10:00:00Z',
          sessionId: 'test',
          message: { role: 'user' as const, content: 'Hello' },
        },
        {
          type: 'summary' as const,
          timestamp: '2025-01-15T10:02:00Z',
          summary: 'test',
        },
      ];

      const tree = buildMessageTree(messages);

      // 应只包含 user 和 assistant 消息
      expect(tree.length).toBe(2);
      // 应按时间排序
      expect(tree[0].type).toBe('user');
      expect(tree[1].type).toBe('assistant');
    });
  });
});
