import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');

function readJson(relativePath: string): Record<string, unknown> {
  const content = readFileSync(resolve(ROOT, relativePath), 'utf-8');
  return JSON.parse(content) as Record<string, unknown>;
}

describe('release-it 配置', () => {
  const pkg = readJson('package.json') as {
    devDependencies: Record<string, string>;
    scripts: Record<string, string>;
    engines: Record<string, string>;
  };

  it('release-it 应为 devDependency', () => {
    expect(pkg.devDependencies).toHaveProperty('release-it');
  });

  it('@release-it/conventional-changelog 应为 devDependency', () => {
    expect(pkg.devDependencies).toHaveProperty(
      '@release-it/conventional-changelog',
    );
  });

  it('package.json 应包含 release 脚本', () => {
    expect(pkg.scripts.release).toBe('release-it');
  });

  it('engines.node 应为 >=22.0.0', () => {
    expect(pkg.engines.node).toBe('>=22.0.0');
  });

  it('.release-it.json 应存在且包含正确配置', () => {
    const config = readJson('.release-it.json');

    // git 配置
    expect(config.git).toEqual({
      commitMessage: '🔖 release: v${version}',
      tagName: 'v${version}',
      tagAnnotation: 'Release v${version}',
      push: true,
      requireCleanWorkingDir: true,
      addUntrackedFiles: true,
    });

    // npm 配置
    expect(config.npm).toEqual({ publish: false });

    // hooks 配置
    expect(config.hooks).toEqual({
      'after:@release-it/conventional-changelog:beforeRelease':
        'npx tsx scripts/translate-changelog.ts',
      'after:release': 'pnpm publish --no-git-checks',
    });

    // github 配置
    expect(config.github).toEqual({
      release: true,
      releaseName: 'v${version}',
    });

    // plugins 配置
    const plugins = config.plugins as Record<string, unknown>;
    expect(plugins).toHaveProperty('@release-it/conventional-changelog');

    const changelogPlugin = plugins[
      '@release-it/conventional-changelog'
    ] as Record<string, unknown>;
    expect(changelogPlugin.infile).toBe('CHANGELOG.md');
    expect(changelogPlugin.header).toBe('# Changelog');

    const preset = changelogPlugin.preset as Record<string, unknown>;
    expect(preset.name).toBe('conventionalcommits');
    expect(preset.types).toHaveLength(10);
  });
});
