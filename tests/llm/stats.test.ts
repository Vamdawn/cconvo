import { describe, it, expect } from 'vitest';
import { computeStats } from '../../src/llm/stats.js';
import type { Conversation, UserMessage, AssistantMessage } from '../../src/models/types.js';

// 构建测试用会话数据
function buildTestConversation(): Conversation {
  const messages = [
    {
      type: 'user' as const,
      uuid: '1',
      parentUuid: null,
      timestamp: '2026-02-13T10:00:00Z',
      sessionId: 'test-session',
      cwd: '/test',
      isSidechain: false,
      message: { role: 'user' as const, content: 'hello' },
    },
    {
      type: 'assistant' as const,
      uuid: '2',
      parentUuid: '1',
      timestamp: '2026-02-13T10:00:05Z',
      isSidechain: false,
      message: {
        role: 'assistant' as const,
        content: [
          { type: 'text' as const, text: 'Let me help you.' },
          { type: 'tool_use' as const, id: 't1', name: 'Read', input: { file_path: '/src/index.ts' } },
          { type: 'tool_use' as const, id: 't2', name: 'Read', input: { file_path: '/src/utils.ts' } },
          { type: 'tool_use' as const, id: 't3', name: 'Edit', input: { file_path: '/src/index.ts', old_string: 'a', new_string: 'b' } },
        ],
        usage: { input_tokens: 1000, output_tokens: 500, cache_creation_input_tokens: 200, cache_read_input_tokens: 300 },
      },
    },
    {
      type: 'user' as const,
      uuid: '3',
      parentUuid: '2',
      timestamp: '2026-02-13T10:01:00Z',
      sessionId: 'test-session',
      cwd: '/test',
      isSidechain: false,
      message: {
        role: 'user' as const,
        content: [{ type: 'tool_result' as const, tool_use_id: 't1', content: 'file content' }],
      },
    },
    {
      type: 'user' as const,
      uuid: '4',
      parentUuid: '3',
      timestamp: '2026-02-13T10:02:00Z',
      sessionId: 'test-session',
      cwd: '/test',
      isSidechain: false,
      message: { role: 'user' as const, content: 'now add tests' },
    },
    {
      type: 'assistant' as const,
      uuid: '5',
      parentUuid: '4',
      timestamp: '2026-02-13T10:02:10Z',
      isSidechain: false,
      message: {
        role: 'assistant' as const,
        content: [
          { type: 'tool_use' as const, id: 't4', name: 'Write', input: { file_path: '/tests/index.test.ts', content: 'test' } },
          { type: 'tool_use' as const, id: 't5', name: 'Bash', input: { command: 'pnpm test' } },
        ],
        usage: { input_tokens: 2000, output_tokens: 800, cache_read_input_tokens: 1500 },
      },
    },
  ] as (UserMessage | AssistantMessage)[];

  return {
    sessionId: 'test-session',
    projectPath: '/test',
    filePath: '/test/session.jsonl',
    messages,
    subagents: [],
    startTime: new Date('2026-02-13T10:00:00Z'),
    endTime: new Date('2026-02-13T10:02:10Z'),
    messageCount: 5,
    totalTokens: { input_tokens: 3000, output_tokens: 1300, cache_creation_input_tokens: 200, cache_read_input_tokens: 1800 },
  };
}

describe('computeStats', () => {
  it('should compute tool usage statistics', () => {
    const conv = buildTestConversation();
    const stats = computeStats(conv);

    expect(stats.toolUsage).toHaveLength(4); // Read, Edit, Write, Bash
    const readStat = stats.toolUsage.find(t => t.name === 'Read');
    expect(readStat).toBeDefined();
    expect(readStat!.count).toBe(2);
  });

  it('should compute token breakdown', () => {
    const conv = buildTestConversation();
    const stats = computeStats(conv);

    expect(stats.tokenBreakdown.totalInput).toBe(3000);
    expect(stats.tokenBreakdown.totalOutput).toBe(1300);
    expect(stats.tokenBreakdown.cacheRead).toBe(1800);
  });

  it('should compute file operations', () => {
    const conv = buildTestConversation();
    const stats = computeStats(conv);

    // /src/index.ts 被 Read 和 Edit 各一次 = 2
    const indexFile = stats.fileOperations.find(f => f.file === '/src/index.ts');
    expect(indexFile).toBeDefined();
    expect(indexFile!.count).toBe(2);
  });

  it('should sort tool usage by count descending', () => {
    const conv = buildTestConversation();
    const stats = computeStats(conv);

    for (let i = 1; i < stats.toolUsage.length; i++) {
      expect(stats.toolUsage[i - 1].count).toBeGreaterThanOrEqual(stats.toolUsage[i].count);
    }
  });

  it('should compute cache hit rate', () => {
    const conv = buildTestConversation();
    const stats = computeStats(conv);

    // cacheRead / totalInput = 1800 / 3000 = 60%
    expect(stats.tokenBreakdown.cacheHitRate).toBeCloseTo(60, 0);
  });
});
