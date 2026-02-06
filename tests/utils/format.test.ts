import { describe, it, expect } from 'vitest';
import {
  formatDateTime,
  formatDate,
  formatSize,
  formatTokens,
  truncate,
  escapeHtml,
  escapeMarkdown,
  getFenceForContent,
  formatDuration,
} from '../../src/utils/format.js';

describe('formatDateTime', () => {
  it('应格式化 Date 对象', () => {
    const date = new Date('2025-01-15T10:30:00');
    expect(formatDateTime(date)).toBe('2025-01-15 10:30:00');
  });

  it('应格式化 ISO 字符串', () => {
    expect(formatDateTime('2025-01-15T10:30:00')).toBe('2025-01-15 10:30:00');
  });
});

describe('formatDate', () => {
  it('应格式化为日期', () => {
    const date = new Date('2025-01-15T10:30:00');
    expect(formatDate(date)).toBe('2025-01-15');
  });
});

describe('formatSize', () => {
  it('应格式化字节 (B)', () => {
    expect(formatSize(500)).toBe('500 B');
    expect(formatSize(0)).toBe('0 B');
  });

  it('应格式化千字节 (KB)', () => {
    expect(formatSize(1024)).toBe('1.0 KB');
    expect(formatSize(2048)).toBe('2.0 KB');
    expect(formatSize(1536)).toBe('1.5 KB');
  });

  it('应格式化兆字节 (MB)', () => {
    expect(formatSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('应格式化千兆字节 (GB)', () => {
    expect(formatSize(1024 * 1024 * 1024)).toBe('1.0 GB');
  });
});

describe('formatTokens', () => {
  it('应格式化小于 1000 的数字', () => {
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(500)).toBe('500');
    expect(formatTokens(999)).toBe('999');
  });

  it('应格式化为 K（千）', () => {
    expect(formatTokens(1000)).toBe('1.0K');
    expect(formatTokens(1500)).toBe('1.5K');
    expect(formatTokens(50000)).toBe('50.0K');
  });

  it('应格式化为 M（百万）', () => {
    expect(formatTokens(1000000)).toBe('1.00M');
    expect(formatTokens(2500000)).toBe('2.50M');
  });
});

describe('truncate', () => {
  it('应保持短文本不变', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('应截断长文本并添加省略号', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });

  it('应使用默认长度 100', () => {
    const longText = 'a'.repeat(150);
    const result = truncate(longText);
    expect(result.length).toBe(100);
    expect(result.endsWith('...')).toBe(true);
  });
});

describe('escapeHtml', () => {
  it('应转义 HTML 特殊字符', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
    expect(escapeHtml('a & b')).toBe('a &amp; b');
    expect(escapeHtml('"quote"')).toBe('&quot;quote&quot;');
    expect(escapeHtml("'single'")).toBe('&#039;single&#039;');
  });

  it('应保持普通文本不变', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('escapeMarkdown', () => {
  it('应转义 Markdown 特殊字符', () => {
    expect(escapeMarkdown('*bold*')).toBe('\\*bold\\*');
    expect(escapeMarkdown('`code`')).toBe('\\`code\\`');
    expect(escapeMarkdown('[link]')).toBe('\\[link\\]');
  });
});

describe('getFenceForContent', () => {
  it('应返回默认 3 个反引号', () => {
    expect(getFenceForContent('normal text')).toBe('```');
  });

  it('应返回比内容中最长反引号序列多一个', () => {
    expect(getFenceForContent('code with ``` inside')).toBe('````');
    expect(getFenceForContent('code with ```` inside')).toBe('`````');
  });
});

describe('formatDuration', () => {
  it('应格式化秒', () => {
    expect(formatDuration(5000)).toBe('5s');
    expect(formatDuration(30000)).toBe('30s');
  });

  it('应格式化分钟和秒', () => {
    expect(formatDuration(90000)).toBe('1m 30s');
    expect(formatDuration(125000)).toBe('2m 5s');
  });

  it('应格式化小时和分钟', () => {
    expect(formatDuration(3600000)).toBe('1h 0m');
    expect(formatDuration(5400000)).toBe('1h 30m');
  });
});
