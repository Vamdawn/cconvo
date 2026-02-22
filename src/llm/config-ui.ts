import chalk from 'chalk';
import readline from 'readline';
import ora from 'ora';
import { t, type Language } from '../utils/i18n.js';
import {
  getLLMConfig,
  addLLMProvider,
  removeLLMProvider,
  updateLLMProvider,
  setActiveLLMProvider,
} from '../utils/settings.js';
import { testConnection } from './client.js';
import { showInteractiveList } from '../components/interactive-list.js';
import { waitForKeypress, clearScreen } from '../utils/terminal.js';
import type { LLMProvider, LLMProviderType } from '../models/types.js';

// 预设供应商
interface ProviderPreset {
  id: string;
  label: string;
  provider: LLMProviderType;
  baseUrl: string;
}

const PROVIDER_PRESETS: ProviderPreset[] = [
  { id: 'openai', label: 'OpenAI', provider: 'openai', baseUrl: 'https://api.openai.com/v1' },
  { id: 'anthropic', label: 'Anthropic', provider: 'anthropic', baseUrl: 'https://api.anthropic.com/v1' },
  { id: 'deepseek', label: 'Deepseek', provider: 'custom', baseUrl: 'https://api.deepseek.com/v1' },
];

// 读取用户输入
function readInput(prompt: string, mask: boolean = false): Promise<string> {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (mask) {
      // API Key 掩码输入
      process.stdout.write(prompt);
      let input = '';
      process.stdin.setRawMode(true);
      process.stdin.resume();

      const onData = (data: Buffer) => {
        const char = data.toString();
        if (char === '\r' || char === '\n') {
          process.stdin.setRawMode(false);
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(input);
        } else if (char === '\x7f' || char === '\b') {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else if (char === '\x03') {
          // Ctrl+C
          process.stdin.setRawMode(false);
          rl.close();
          resolve('');
        } else {
          input += char;
          process.stdout.write('*');
        }
      };
      process.stdin.on('data', onData);
    } else {
      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

// 显示 LLM 配置菜单
export async function showLLMConfig(lang: Language): Promise<void> {
  while (true) {
    const config = getLLMConfig();
    const providers = config?.providers || [];

    // 构建列表项
    const items = providers.map(p => ({
      id: p.name,
      label: config?.active === p.name ? `✓ ${p.name}` : `  ${p.name}`,
      description: `${p.provider} - ${p.model}`,
    }));

    // 添加"新增配置"选项
    items.push({
      id: '__add__',
      label: `+ ${t('llmAddProvider', lang)}`,
      description: '',
    });

    const result = await showInteractiveList({
      title: t('llmConfig', lang),
      items,
      showBanner: true,
      showIndex: false,
      language: lang,
    });

    if (result.action === 'back' || result.action === 'main' || result.action === 'quit') {
      return;
    }

    if (result.action === 'select' && result.item) {
      if (result.item.id === '__add__') {
        await addNewProvider(lang);
      } else {
        await showProviderActions(result.item.id, lang);
      }
    }
  }
}

// 添加新供应商
async function addNewProvider(lang: Language): Promise<void> {
  clearScreen();

  // 1. 选择供应商
  const presetItems = [
    ...PROVIDER_PRESETS.map(p => ({ id: p.id, label: p.label, description: p.baseUrl })),
    { id: 'custom', label: t('llmCustom', lang), description: '' },
  ];

  const presetResult = await showInteractiveList({
    title: t('llmSelectProvider', lang),
    items: presetItems,
    showBanner: true,
    showIndex: false,
    language: lang,
  });

  if (presetResult.action !== 'select' || !presetResult.item) return;

  const preset = PROVIDER_PRESETS.find(p => p.id === presetResult.item!.id);

  // 2. 输入配置名称
  const name = await readInput(`  ${t('llmEnterName', lang)}: `);
  if (!name) return;

  // 3. 确定 provider 和 baseUrl
  let providerType: LLMProviderType;
  let baseUrl: string;

  if (preset) {
    providerType = preset.provider;
    baseUrl = preset.baseUrl;
  } else {
    providerType = 'custom';
    baseUrl = await readInput(`  ${t('llmEnterBaseUrl', lang)}: `);
    if (!baseUrl) return;
  }

  // 4. 输入 API Key
  const apiKey = await readInput(`  ${t('llmEnterApiKey', lang)}: `, true);
  if (!apiKey) return;

  // 5. 输入模型名称
  const model = await readInput(`  ${t('llmEnterModel', lang)}: `);
  if (!model) return;

  const provider: LLMProvider = { name, provider: providerType, baseUrl, apiKey, model };

  // 6. 连接测试
  const spinner = ora(t('llmTesting', lang)).start();
  const success = await testConnection(provider);

  if (success) {
    spinner.succeed(t('llmTestSuccess', lang));
  } else {
    spinner.fail(t('llmTestFailed', lang));
  }

  // 7. 保存（即使测试失败也保存，用户可能稍后修复）
  const config = getLLMConfig();
  const isFirst = !config || config.providers.length === 0;
  addLLMProvider(provider, isFirst);

  // 8. 如果不是第一个，询问是否设为活跃
  if (!isFirst) {
    console.log();
    const setActive = await readInput(`  ${t('llmSetAsActive', lang)} (y/n): `);
    if (setActive.toLowerCase() === 'y') {
      setActiveLLMProvider(name);
    }
  }
}

// 显示供应商操作菜单
async function showProviderActions(providerName: string, lang: Language): Promise<void> {
  const config = getLLMConfig();
  if (!config) return;

  const isActive = config.active === providerName;

  const actionItems = [
    ...(!isActive ? [{ id: 'activate', label: t('llmSetActive', lang), description: '' }] : []),
    { id: 'edit', label: t('llmEdit', lang), description: '' },
    { id: 'test', label: t('llmTestConnection', lang), description: '' },
    { id: 'delete', label: t('llmDelete', lang), description: '' },
  ];

  const result = await showInteractiveList({
    title: providerName + (isActive ? ` (${t('llmCurrentActive', lang)})` : ''),
    items: actionItems,
    showBanner: true,
    showIndex: false,
    language: lang,
  });

  if (result.action !== 'select' || !result.item) return;

  const provider = config.providers.find(p => p.name === providerName);
  if (!provider) return;

  switch (result.item.id) {
    case 'activate':
      setActiveLLMProvider(providerName);
      break;
    case 'edit':
      await editProvider(provider, lang);
      break;
    case 'test': {
      const spinner = ora(t('llmTesting', lang)).start();
      const success = await testConnection(provider);
      if (success) {
        spinner.succeed(t('llmTestSuccess', lang));
      } else {
        spinner.fail(t('llmTestFailed', lang));
      }
      // 等待用户按键返回
      await waitForKeypress();
      break;
    }
    case 'delete': {
      const confirm = await readInput(`  ${t('llmConfirmDelete', lang)} (y/n): `);
      if (confirm.toLowerCase() === 'y') {
        removeLLMProvider(providerName);
      }
      break;
    }
  }
}

// 编辑供应商
async function editProvider(provider: LLMProvider, lang: Language): Promise<void> {
  clearScreen();
  console.log(chalk.bold(`  ${t('llmEdit', lang)}: ${provider.name}`));
  console.log();

  const name = await readInput(`  ${t('llmEnterName', lang)} [${provider.name}]: `);
  const baseUrl = await readInput(`  ${t('llmEnterBaseUrl', lang)} [${provider.baseUrl}]: `);
  const apiKey = await readInput(`  ${t('llmEnterApiKey', lang)} [****]: `, true);
  const model = await readInput(`  ${t('llmEnterModel', lang)} [${provider.model}]: `);

  const updated: LLMProvider = {
    name: name || provider.name,
    provider: provider.provider,
    baseUrl: baseUrl || provider.baseUrl,
    apiKey: apiKey || provider.apiKey,
    model: model || provider.model,
  };

  updateLLMProvider(provider.name, updated);
}
