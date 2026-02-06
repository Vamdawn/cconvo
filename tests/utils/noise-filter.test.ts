import { describe, it, expect } from 'vitest';
import {
  isNoiseContent,
  isSkillLoading,
  extractSkillTrigger,
  extractCommand,
  cleanUserInput,
  isSlashCommand,
  isCompactSummary,
  isTaskNotification,
} from '../../src/utils/noise-filter.js';

describe('isNoiseContent', () => {
  it('应识别系统提醒为噪音', () => {
    expect(isNoiseContent('<system-reminder>Some reminder</system-reminder>')).toBe(true);
  });

  it('应识别 bash 输出为噪音', () => {
    expect(isNoiseContent('<bash-stdout>output</bash-stdout>')).toBe(true);
    expect(isNoiseContent('<bash-stderr>error</bash-stderr>')).toBe(true);
    expect(isNoiseContent('<bash-input>command</bash-input>')).toBe(true);
  });

  it('应识别请求中断为噪音', () => {
    expect(isNoiseContent('[Request interrupted by user')).toBe(true);
  });

  it('应保留正常文本', () => {
    expect(isNoiseContent('Hello, how are you?')).toBe(false);
    expect(isNoiseContent('Please help me with this code')).toBe(false);
  });
});

describe('isSkillLoading', () => {
  it('应识别 Skill 加载内容', () => {
    const skillContent = 'Base directory for this skill: /path/to/skill';
    expect(isSkillLoading(skillContent)).toBe(true);
  });

  it('应拒绝普通内容', () => {
    expect(isSkillLoading('Hello world')).toBe(false);
  });
});

describe('extractSkillTrigger', () => {
  it('应提取技能名称', () => {
    const content = 'Base directory for this skill: /Users/chen/.claude/skills/commit';
    expect(extractSkillTrigger(content)).toBe('/commit');
  });

  it('应处理带斜杠结尾的路径', () => {
    const content = 'Base directory for this skill: /path/to/skill-name/';
    expect(extractSkillTrigger(content)).toBe('/skill-name');
  });

  it('应返回 null 对于非技能内容', () => {
    expect(extractSkillTrigger('normal text')).toBe(null);
  });
});

describe('extractCommand', () => {
  it('应从 command-name 标签提取命令', () => {
    const text = '<command-name>/commit</command-name>';
    expect(extractCommand(text)).toBe('/commit');
  });

  it('应从 command-message 标签提取命令', () => {
    const text = '<command-message>commit</command-message>';
    expect(extractCommand(text)).toBe('/commit');
  });

  it('应返回 null 对于无标签内容', () => {
    expect(extractCommand('plain text')).toBe(null);
  });
});

describe('cleanUserInput', () => {
  it('应移除系统标签', () => {
    const input = 'Hello <system-reminder>reminder</system-reminder> world';
    expect(cleanUserInput(input)).toBe('Hello  world');
  });

  it('应提取命令标签中的命令', () => {
    const input = '<command-name>/help</command-name>';
    expect(cleanUserInput(input)).toBe('/help');
  });

  it('应保持普通文本不变', () => {
    expect(cleanUserInput('Hello world')).toBe('Hello world');
  });

  it('应修剪空白', () => {
    expect(cleanUserInput('  hello  ')).toBe('hello');
  });
});

describe('isSlashCommand', () => {
  it('应识别斜杠命令', () => {
    expect(isSlashCommand('/help')).toBe(true);
    expect(isSlashCommand('/commit')).toBe(true);
  });

  it('应拒绝带参数的命令', () => {
    expect(isSlashCommand('/commit -m "msg"')).toBe(false);
  });

  it('应拒绝非斜杠开头的文本', () => {
    expect(isSlashCommand('hello')).toBe(false);
    expect(isSlashCommand('not/a/command')).toBe(false);
  });
});

describe('isCompactSummary', () => {
  it('应识别 compact summary 消息', () => {
    const message = {
      type: 'user' as const,
      uuid: 'test',
      parentUuid: null,
      timestamp: '2026-01-01T00:00:00Z',
      sessionId: 'test',
      cwd: '/test',
      isSidechain: false,
      isCompactSummary: true,
      message: { role: 'user' as const, content: 'This session is being continued...' },
    };
    expect(isCompactSummary(message)).toBe(true);
  });

  it('应拒绝普通用户消息', () => {
    const message = {
      type: 'user' as const,
      uuid: 'test',
      parentUuid: null,
      timestamp: '2026-01-01T00:00:00Z',
      sessionId: 'test',
      cwd: '/test',
      isSidechain: false,
      message: { role: 'user' as const, content: 'Hello' },
    };
    expect(isCompactSummary(message)).toBe(false);
  });
});

describe('isTaskNotification', () => {
  it('应识别 task notification 消息', () => {
    const message = {
      type: 'user' as const,
      uuid: 'test',
      parentUuid: null,
      timestamp: '2026-01-01T00:00:00Z',
      sessionId: 'test',
      cwd: '/test',
      isSidechain: false,
      message: {
        role: 'user' as const,
        content: '<task-notification>\n<task-id>abc123</task-id>\n</task-notification>',
      },
    };
    expect(isTaskNotification(message)).toBe(true);
  });

  it('应拒绝普通用户消息', () => {
    const message = {
      type: 'user' as const,
      uuid: 'test',
      parentUuid: null,
      timestamp: '2026-01-01T00:00:00Z',
      sessionId: 'test',
      cwd: '/test',
      isSidechain: false,
      message: { role: 'user' as const, content: 'Hello' },
    };
    expect(isTaskNotification(message)).toBe(false);
  });
});
