import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const WORKFLOWS_DIR = resolve(ROOT, '.github', 'workflows');
const CI_YML_PATH = resolve(WORKFLOWS_DIR, 'ci.yml');

describe('CI workflow', () => {
  it('.github/workflows/ 目录应存在', () => {
    expect(existsSync(WORKFLOWS_DIR)).toBe(true);
    expect(statSync(WORKFLOWS_DIR).isDirectory()).toBe(true);
  });

  it('.github/workflows/ci.yml 文件应存在', () => {
    expect(existsSync(CI_YML_PATH)).toBe(true);
  });

  it('ci.yml 应包含正确的 workflow 名称', () => {
    const content = readFileSync(CI_YML_PATH, 'utf-8');
    expect(content).toContain('name: CI');
  });

  it('ci.yml 应在 push 和 pull_request 的 main 分支触发', () => {
    const content = readFileSync(CI_YML_PATH, 'utf-8');
    expect(content).toContain('push:');
    expect(content).toContain('pull_request:');
    expect(content).toContain('branches: [main]');
  });

  it('ci.yml 应使用 ubuntu-latest 和 node 20/22 矩阵', () => {
    const content = readFileSync(CI_YML_PATH, 'utf-8');
    expect(content).toContain('runs-on: ubuntu-latest');
    expect(content).toContain('node-version: [20, 22]');
  });

  it('ci.yml 应使用 actions/checkout@v4', () => {
    const content = readFileSync(CI_YML_PATH, 'utf-8');
    expect(content).toContain('uses: actions/checkout@v4');
  });

  it('ci.yml 应使用 pnpm/action-setup@v4 版本 10', () => {
    const content = readFileSync(CI_YML_PATH, 'utf-8');
    expect(content).toContain('uses: pnpm/action-setup@v4');
    expect(content).toContain('version: 10');
  });

  it('ci.yml 应使用 actions/setup-node@v4 并缓存 pnpm', () => {
    const content = readFileSync(CI_YML_PATH, 'utf-8');
    expect(content).toContain('uses: actions/setup-node@v4');
    expect(content).toContain("cache: 'pnpm'");
  });

  it('ci.yml 应使用 frozen-lockfile 安装依赖', () => {
    const content = readFileSync(CI_YML_PATH, 'utf-8');
    expect(content).toContain('pnpm install --frozen-lockfile');
  });

  it('ci.yml 应运行 Typecheck、Lint 和 Test with coverage', () => {
    const content = readFileSync(CI_YML_PATH, 'utf-8');
    expect(content).toContain('name: Typecheck');
    expect(content).toContain('run: pnpm typecheck');
    expect(content).toContain('name: Lint');
    expect(content).toContain('run: pnpm lint');
    expect(content).toContain('name: Test with coverage');
    expect(content).toContain('run: pnpm test:coverage');
  });

  it('ci.yml 应使用 matrix.node-version 模板变量', () => {
    const content = readFileSync(CI_YML_PATH, 'utf-8');
    expect(content).toContain('${{ matrix.node-version }}');
  });
});
