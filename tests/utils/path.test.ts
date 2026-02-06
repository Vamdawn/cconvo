import { describe, it, expect } from 'vitest';
import {
  decodePath,
  encodePath,
  getProjectName,
  isJsonlFile,
  isUUID,
  extractSessionId,
} from '../../src/utils/path.js';

describe('encodePath', () => {
  it('应将斜杠替换为连字符', () => {
    expect(encodePath('/Users/chen/project')).toBe('-Users-chen-project');
  });

  it('应处理根路径', () => {
    expect(encodePath('/')).toBe('-');
  });
});

describe('decodePath', () => {
  it('应将连字符替换为斜杠', () => {
    expect(decodePath('-Users-chen-project')).toBe('/Users/chen/project');
  });

  it('应处理单个连字符', () => {
    expect(decodePath('-')).toBe('/');
  });
});

describe('getProjectName', () => {
  it('应提取项目名称', () => {
    expect(getProjectName('-Users-chen-Repository-cconvo')).toBe('cconvo');
  });

  it('应处理深层路径', () => {
    expect(getProjectName('-Users-chen-dev-projects-my-app')).toBe('app');
  });
});

describe('isJsonlFile', () => {
  it('应识别 JSONL 文件', () => {
    expect(isJsonlFile('conversation.jsonl')).toBe(true);
    expect(isJsonlFile('abc123.jsonl')).toBe(true);
  });

  it('应拒绝非 JSONL 文件', () => {
    expect(isJsonlFile('file.json')).toBe(false);
    expect(isJsonlFile('file.txt')).toBe(false);
    expect(isJsonlFile('jsonl')).toBe(false);
  });
});

describe('isUUID', () => {
  it('应识别有效 UUID', () => {
    expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
  });

  it('应拒绝无效 UUID', () => {
    expect(isUUID('not-a-uuid')).toBe(false);
    expect(isUUID('550e8400-e29b-41d4-a716')).toBe(false);
    expect(isUUID('')).toBe(false);
    expect(isUUID('550e8400e29b41d4a716446655440000')).toBe(false); // 无连字符
  });

  it('应支持大小写', () => {
    expect(isUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });
});

describe('extractSessionId', () => {
  it('应从文件名提取 sessionId', () => {
    expect(extractSessionId('550e8400-e29b-41d4-a716-446655440000.jsonl'))
      .toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('应返回 null 对于非 UUID 文件名', () => {
    expect(extractSessionId('not-a-uuid.jsonl')).toBe(null);
    expect(extractSessionId('conversation.jsonl')).toBe(null);
  });
});
