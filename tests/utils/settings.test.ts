import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock fs 和 os
vi.mock('fs');
vi.mock('os');

describe('settings LLM config', () => {
  const mockHome = '/mock/home';
  const settingsPath = path.join(mockHome, '.cconvo', 'settings.json');

  beforeEach(() => {
    vi.mocked(os.homedir).mockReturnValue(mockHome);
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return undefined when no LLM config exists', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ language: 'en' }));

    const { getLLMConfig } = await import('../../src/utils/settings.js');
    expect(getLLMConfig()).toBeUndefined();
  });

  it('should return LLM config when it exists', async () => {
    const settings = {
      language: 'en',
      llm: {
        active: 'test',
        providers: [{ name: 'test', provider: 'openai', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', model: 'gpt-4o' }],
      },
    };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settings));

    const { getLLMConfig } = await import('../../src/utils/settings.js');
    const config = getLLMConfig();
    expect(config).toBeDefined();
    expect(config!.active).toBe('test');
    expect(config!.providers).toHaveLength(1);
  });

  it('should get active provider', async () => {
    const provider = { name: 'my-openai', provider: 'openai' as const, baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', model: 'gpt-4o' };
    const settings = {
      language: 'en',
      llm: { active: 'my-openai', providers: [provider] },
    };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settings));

    const { getActiveLLMProvider } = await import('../../src/utils/settings.js');
    const active = getActiveLLMProvider();
    expect(active).toBeDefined();
    expect(active!.name).toBe('my-openai');
  });

  it('should return undefined when no active provider matches', async () => {
    const settings = {
      language: 'en',
      llm: { active: 'nonexistent', providers: [] },
    };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settings));

    const { getActiveLLMProvider } = await import('../../src/utils/settings.js');
    expect(getActiveLLMProvider()).toBeUndefined();
  });

  it('should save LLM config', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ language: 'zh' }));
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});

    const { saveLLMConfig } = await import('../../src/utils/settings.js');
    const llmConfig = {
      active: 'test',
      providers: [{ name: 'test', provider: 'openai' as const, baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', model: 'gpt-4o' }],
    };
    saveLLMConfig(llmConfig);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      settingsPath,
      expect.stringContaining('"active": "test"'),
      'utf-8'
    );
  });
});
