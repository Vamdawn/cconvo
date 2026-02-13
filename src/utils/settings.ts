import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Language } from './i18n.js';
import type { LLMConfig, LLMProvider } from '../models/types.js';

// 配置类型
export interface Settings {
  language: Language;
  llm?: LLMConfig;
}

// 默认配置
const DEFAULT_SETTINGS: Settings = {
  language: 'en',
};

// 获取配置目录路径
function getSettingsDir(): string {
  return path.join(os.homedir(), '.cconvo');
}

// 获取配置文件路径
export function getSettingsPath(): string {
  return path.join(getSettingsDir(), 'settings.json');
}

// 加载配置
export function loadSettings(): Settings {
  const filePath = getSettingsPath();

  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content) as Partial<Settings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // 配置文件损坏时返回默认值
  }

  return { ...DEFAULT_SETTINGS };
}

// 保存配置
export function saveSettings(settings: Settings): void {
  const dir = getSettingsDir();
  const filePath = getSettingsPath();

  // 确保目录存在
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8');
}

// 获取当前语言
export function getLanguage(): Language {
  return loadSettings().language;
}

// 设置语言
export function setLanguage(lang: Language): void {
  const settings = loadSettings();
  settings.language = lang;
  saveSettings(settings);
}

// 获取 LLM 配置
export function getLLMConfig(): LLMConfig | undefined {
  return loadSettings().llm;
}

// 保存 LLM 配置
export function saveLLMConfig(llmConfig: LLMConfig): void {
  const settings = loadSettings();
  settings.llm = llmConfig;
  saveSettings(settings);
}

// 获取当前活跃的 LLM 供应商
export function getActiveLLMProvider(): LLMProvider | undefined {
  const config = getLLMConfig();
  if (!config) return undefined;
  return config.providers.find(p => p.name === config.active);
}

// 添加 LLM 供应商
export function addLLMProvider(provider: LLMProvider, setActive: boolean = false): void {
  const settings = loadSettings();
  if (!settings.llm) {
    settings.llm = { active: '', providers: [] };
  }
  settings.llm.providers.push(provider);
  if (setActive || settings.llm.providers.length === 1) {
    settings.llm.active = provider.name;
  }
  saveSettings(settings);
}

// 删除 LLM 供应商
export function removeLLMProvider(name: string): void {
  const settings = loadSettings();
  if (!settings.llm) return;
  settings.llm.providers = settings.llm.providers.filter(p => p.name !== name);
  if (settings.llm.active === name) {
    settings.llm.active = settings.llm.providers[0]?.name || '';
  }
  saveSettings(settings);
}

// 更新 LLM 供应商
export function updateLLMProvider(name: string, updated: LLMProvider): void {
  const settings = loadSettings();
  if (!settings.llm) return;
  const index = settings.llm.providers.findIndex(p => p.name === name);
  if (index === -1) return;
  settings.llm.providers[index] = updated;
  // 如果修改了名称，需要更新 active 引用
  if (settings.llm.active === name) {
    settings.llm.active = updated.name;
  }
  saveSettings(settings);
}

// 设置活跃供应商
export function setActiveLLMProvider(name: string): void {
  const settings = loadSettings();
  if (!settings.llm) return;
  if (settings.llm.providers.some(p => p.name === name)) {
    settings.llm.active = name;
    saveSettings(settings);
  }
}
