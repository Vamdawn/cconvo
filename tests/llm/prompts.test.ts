import { describe, it, expect } from 'vitest';
import {
  buildTimelinePrompt,
  buildPatternsPrompt,
  buildKnowledgePrompt,
  buildQualityPrompt,
} from '../../src/llm/prompts.js';
import type { ConversationStats } from '../../src/models/types.js';

const mockTurns = [
  {
    turnNumber: 1,
    timestamp: '10:00:00',
    userInput: '请帮我实现登录功能',
    agentContent: 'Read src/auth.ts\nEdit src/auth.ts\n创建了 JWT 登录逻辑',
  },
];

const mockStats: ConversationStats = {
  totalTurns: 1,
  totalDuration: 60000,
  toolUsage: [{ name: 'Read', count: 5, percentage: 50 }, { name: 'Edit', count: 3, percentage: 30 }],
  tokenBreakdown: { totalInput: 1000, totalOutput: 500, cacheCreation: 100, cacheRead: 200, cacheHitRate: 20 },
  fileOperations: [{ file: 'src/auth.ts', count: 3 }],
  perTurnTokens: [{ turn: 1, input: 1000, output: 500 }],
};

describe('prompts', () => {
  it('should build timeline prompt with language instruction', () => {
    const result = buildTimelinePrompt(mockTurns, 'zh');
    expect(result.messages.length).toBeGreaterThanOrEqual(2);
    // system prompt 应包含语言指令
    expect(result.messages[0].content).toContain('中文');
  });

  it('should build timeline prompt in English', () => {
    const result = buildTimelinePrompt(mockTurns, 'en');
    expect(result.messages[0].content).toContain('English');
  });

  it('should build patterns prompt with stats data', () => {
    const result = buildPatternsPrompt(mockStats, 'zh');
    expect(result.messages[1].content).toContain('Read');
    expect(result.messages[1].content).toContain('50');
  });

  it('should build knowledge prompt', () => {
    const result = buildKnowledgePrompt(mockTurns, 'en');
    expect(result.messages.length).toBeGreaterThanOrEqual(2);
  });

  it('should build quality prompt', () => {
    const result = buildQualityPrompt(mockTurns, mockStats, 'en');
    expect(result.messages.length).toBeGreaterThanOrEqual(2);
  });
});
