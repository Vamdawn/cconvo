import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Language } from './i18n.js';

// 配置类型
export interface Settings {
  language: Language;
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
