import chalk from 'chalk';
import ora from 'ora';
import { scanProjects, findProjectByPath } from './core/scanner.js';
import type { Project } from './models/types.js';
import { showConversationList } from './components/conversation-list.js';
import { showBanner } from './components/banner.js';
import { showInteractiveList, type ListItem } from './components/interactive-list.js';
import { t, type Language } from './utils/i18n.js';
import { formatSize } from './utils/format.js';
import { getLanguage, setLanguage } from './utils/settings.js';
import { showLLMConfig } from './llm/config-ui.js';
import { waitForKeypress, exitApp, enterTUI, exitTUI, beginRender, printLine, flushRender } from './utils/terminal.js';

// 当前语言（从配置加载）
let currentLang: Language = getLanguage();

// 语言显示名称
const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  zh: '简体中文',
};

// 获取当前语言（供其他模块使用）
export function getCurrentLanguage(): Language {
  return currentLang;
}

// 导航结果类型
type NavigationResult = 'continue' | 'back' | 'main';

// 显示主菜单
async function showMainMenu(): Promise<'browse' | 'stats' | 'settings' | 'quit' | 'continue'> {
  const menuItems: ListItem[] = [
    { id: 'browse', label: t('browseProjects', currentLang), description: '' },
    { id: 'stats', label: t('viewStatistics', currentLang), description: '' },
    { id: 'settings', label: t('settings', currentLang), description: '' },
  ];

  const result = await showInteractiveList({
    title: t('home', currentLang),
    items: menuItems,
    showBanner: true,
    showCount: false,
    language: currentLang,
  });

  if (result.action === 'quit') {
    return 'quit';
  }

  if (result.action === 'back' || result.action === 'main') {
    return 'continue';  // ESC 在主菜单时继续显示主菜单
  }

  return result.item?.id as 'browse' | 'stats' | 'settings';
}

// 交互式启动选项
interface InteractiveOptions {
  /** 是否检测当前目录项目 */
  detectProject?: boolean;
}

// 交互式主程序
export async function runInteractive(options: InteractiveOptions = {}): Promise<void> {
  enterTUI();
  showBanner();

  if (options.detectProject) {
    // 检测当前目录是否为已记录的项目
    const cwd = process.cwd();
    const spinner = ora(t('detectingProject', currentLang)).start();
    const currentProject = await findProjectByPath(cwd);

    if (currentProject && currentProject.conversations.length > 0) {
      spinner.succeed(`${t('detectedProject', currentLang)}: ${currentProject.name} (${currentProject.conversations.length} ${t('conversations', currentLang)})`);

      // 循环显示对话列表，直到用户选择退出或返回主菜单
      while (true) {
        const result = await showConversationList(currentProject);

        if (result.action === 'quit') {
          exitTUI();
          console.log(chalk.gray(`\n${t('goodbye', currentLang)}`));
          return;
        }

        if (result.action === 'main') {
          // 跳出循环，继续显示主菜单
          break;
        }

        // result.action === 'back' 时继续循环，返回对话列表
      }
    } else {
      spinner.info(t('noProjectDetected', currentLang));
      console.log(chalk.gray(`  ${t('pressAnyKeyToReturn', currentLang)}`));
      await waitForKeypress();
    }
  }

  // 主菜单循环
  while (true) {
    const action = await showMainMenu();

    switch (action) {
      case 'browse':
        await browseProjects();
        break;
      case 'stats':
        await showStatistics();
        break;
      case 'settings':
        await showSettings();
        break;
      case 'quit':
        exitTUI();
        console.log(chalk.gray(`\n${t('goodbye', currentLang)}`));
        return;
      case 'continue':
        // ESC 按下，继续显示主菜单
        break;
    }
  }
}

// 浏览项目
async function browseProjects(): Promise<NavigationResult> {
  const spinner = ora(t('loadingProjects', currentLang)).start();
  const result = await scanProjects();
  spinner.stop();

  if (result.projects.length === 0) {
    console.log(chalk.yellow(`\n${t('noProjects', currentLang)}\n`));
    await waitForKeypress();
    return 'back';
  }

  const projectItems: ListItem[] = result.projects.map(p => ({
    id: p.originalPath,
    label: p.isDeleted ? `${p.name} ${chalk.red(`[${t('deleted', currentLang)}]`)}` : p.name,
    description: `${p.totalConversations} ${t('conversations', currentLang)}`,
    data: p,
  }));

  const listResult = await showInteractiveList({
    title: t('selectProject', currentLang),
    items: projectItems,
    showBanner: true,
    language: currentLang,
  });

  if (listResult.action === 'quit') {
    exitApp();
  }

  if (listResult.action === 'back' || listResult.action === 'main') {
    return listResult.action === 'main' ? 'main' : 'back';
  }

  if (listResult.action === 'select' && listResult.item) {
    const project = listResult.item.data as Project;
    return await browseConversations(project);
  }

  return 'back';
}

// 浏览对话
async function browseConversations(project: Project): Promise<NavigationResult> {
  while (true) {
    const result = await showConversationList(project);

    if (result.action === 'quit') {
      exitApp();
    }

    if (result.action === 'main') {
      return 'main';
    }

    // result.action === 'back' 返回项目列表
    return 'back';
  }
}

// 显示统计
async function showStatistics(): Promise<void> {
  const spinner = ora(t('calculatingStats', currentLang)).start();
  const result = await scanProjects();
  spinner.stop();

  beginRender();
  showBanner();

  printLine(chalk.bold(`  📊 ${t('statistics', currentLang)}`));
  printLine();
  printLine(`  ${chalk.gray(t('totalProjects', currentLang) + ':')}       ${chalk.cyan(result.projects.length)}`);
  printLine(`  ${chalk.gray(t('totalConversations', currentLang) + ':')}       ${chalk.cyan(result.totalConversations)}`);
  printLine(`  ${chalk.gray(t('totalSize', currentLang) + ':')}         ${chalk.cyan(formatSize(result.totalSize))}`);
  printLine();

  // Top 10 项目
  printLine(chalk.bold(`  ${t('topProjectsBySize', currentLang)}:`));
  printLine();

  const sorted = [...result.projects].sort((a, b) => b.totalSize - a.totalSize).slice(0, 10);

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const bar = '█'.repeat(Math.ceil((p.totalSize / result.totalSize) * 20));
    printLine(`  ${(i + 1).toString().padStart(2)}. ${p.name.slice(0, 20).padEnd(20)} ${formatSize(p.totalSize).padStart(10)} ${chalk.blue(bar)}`);
  }

  printLine();
  printLine(chalk.gray(`  ${t('pressAnyKeyToReturn', currentLang)}`));

  flushRender();

  await waitForKeypress();
}

// 显示设置菜单
async function showSettings(): Promise<void> {
  while (true) {
    const currentLanguageName = LANGUAGE_NAMES[currentLang];

    const settingsItems: ListItem[] = [
      {
        id: 'language',
        label: `${t('language', currentLang)}: ${currentLanguageName}`,
        description: ''
      },
      {
        id: 'llm',
        label: t('llmConfig', currentLang),
        description: ''
      },
    ];

    const result = await showInteractiveList({
      title: t('settings', currentLang),
      items: settingsItems,
      showBanner: true,
      language: currentLang,
    });

    if (result.action === 'quit') {
      exitApp();
    }

    if (result.action === 'back' || result.action === 'main') {
      return;
    }

    if (result.action === 'select') {
      if (result.item?.id === 'language') {
        await showLanguageSettings();
      } else if (result.item?.id === 'llm') {
        await showLLMConfig(currentLang);
      }
    }
  }
}

// 显示语言设置
async function showLanguageSettings(): Promise<void> {
  const languages: Language[] = ['en', 'zh'];

  const languageItems: ListItem[] = languages.map(lang => ({
    id: lang,
    label: LANGUAGE_NAMES[lang],
    description: lang === currentLang ? '✓' : '',
  }));

  const result = await showInteractiveList({
    title: t('selectLanguage', currentLang),
    items: languageItems,
    showBanner: true,
    language: currentLang,
  });

  if (result.action === 'quit') {
    exitApp();
  }

  if (result.action === 'select' && result.item) {
    const newLang = result.item.id as Language;
    if (newLang !== currentLang) {
      setLanguage(newLang);
      currentLang = newLang;
    }
  }
}
