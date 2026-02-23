import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');

describe('.npmignore', () => {
  const npmignorePath = resolve(ROOT, '.npmignore');

  it('.npmignore 文件应存在', () => {
    expect(existsSync(npmignorePath)).toBe(true);
  });

  it('应排除 scripts/translate-changelog.ts', () => {
    const content = readFileSync(npmignorePath, 'utf-8');
    const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
    expect(lines).toContain('scripts/translate-changelog.ts');
  });
});
