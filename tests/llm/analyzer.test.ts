import { describe, it, expect } from 'vitest';
import { prepareTurns } from '../../src/llm/analyzer.js';
import type { Conversation, UserMessage, AssistantMessage } from '../../src/models/types.js';

describe('prepareTurns', () => {
  it('should extract user input and agent content per turn', () => {
    const messages = [
      {
        type: 'user' as const,
        uuid: '1',
        parentUuid: null,
        timestamp: '2026-02-13T10:00:00Z',
        sessionId: 's1',
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
            { type: 'text' as const, text: 'Hi there!' },
            { type: 'tool_use' as const, id: 't1', name: 'Read', input: { file_path: '/src/index.ts' } },
          ],
        },
      },
    ] as (UserMessage | AssistantMessage)[];

    const conversation: Conversation = {
      sessionId: 's1',
      projectPath: '/test',
      filePath: '/test/s1.jsonl',
      messages,
      subagents: [],
      startTime: new Date('2026-02-13T10:00:00Z'),
      endTime: new Date('2026-02-13T10:00:05Z'),
      messageCount: 2,
      totalTokens: { input_tokens: 100, output_tokens: 50 },
    };

    const turns = prepareTurns(conversation);
    expect(turns).toHaveLength(1);
    expect(turns[0].userInput).toBe('hello');
    expect(turns[0].agentContent).toContain('Hi there!');
    expect(turns[0].agentContent).toContain('Read');
  });

  it('should skip tool result user messages', () => {
    const messages = [
      {
        type: 'user' as const,
        uuid: '1',
        parentUuid: null,
        timestamp: '2026-02-13T10:00:00Z',
        sessionId: 's1',
        cwd: '/test',
        isSidechain: false,
        message: { role: 'user' as const, content: 'do something' },
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
            { type: 'tool_use' as const, id: 't1', name: 'Bash', input: { command: 'ls' } },
          ],
        },
      },
      {
        type: 'user' as const,
        uuid: '3',
        parentUuid: '2',
        timestamp: '2026-02-13T10:00:06Z',
        sessionId: 's1',
        cwd: '/test',
        isSidechain: false,
        message: {
          role: 'user' as const,
          content: [{ type: 'tool_result' as const, tool_use_id: 't1', content: 'file1.ts' }],
        },
      },
      {
        type: 'user' as const,
        uuid: '4',
        parentUuid: '3',
        timestamp: '2026-02-13T10:01:00Z',
        sessionId: 's1',
        cwd: '/test',
        isSidechain: false,
        message: { role: 'user' as const, content: 'second question' },
      },
      {
        type: 'assistant' as const,
        uuid: '5',
        parentUuid: '4',
        timestamp: '2026-02-13T10:01:05Z',
        isSidechain: false,
        message: {
          role: 'assistant' as const,
          content: [{ type: 'text' as const, text: 'Here is the answer.' }],
        },
      },
    ] as (UserMessage | AssistantMessage)[];

    const conversation: Conversation = {
      sessionId: 's1',
      projectPath: '/test',
      filePath: '/test/s1.jsonl',
      messages,
      subagents: [],
      startTime: new Date('2026-02-13T10:00:00Z'),
      endTime: new Date('2026-02-13T10:01:05Z'),
      messageCount: 5,
      totalTokens: { input_tokens: 100, output_tokens: 50 },
    };

    const turns = prepareTurns(conversation);
    // 应该只有 2 个轮次（跳过 tool result 用户消息）
    expect(turns).toHaveLength(2);
    expect(turns[0].userInput).toBe('do something');
    expect(turns[1].userInput).toBe('second question');
  });
});
