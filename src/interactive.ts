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

// 当前语言（从配置加载）
let currentLang: Language = getLanguage();

// 获取当前语言（供其他模块使用）
export function getCurrentLanguage(): Language {
  return currentLang;
}

// 导航结果类型
type NavigationResult = 'continue' | 'back' | 'main';

// 显示主菜单
async function showMainMenu(): Promise<'browse' | 'stats' | 'quit'> {
  const menuItems: ListItem[] = [
    { id: 'browse', label: t('browseProjects', currentLang), description: '' },
    { id: 'stats', label: t('viewStatistics', currentLang), description: '' },
  ];

  const result = await showInteractiveList({
    title: t('menu', currentLang),
    items: menuItems,
    showBanner: true,
    language: currentLang,
  });

  if (result.action === 'quit' || result.action === 'back') {
    return 'quit';
  }

  return result.item?.id as 'browse' | 'stats';
}

// 等待任意键
async function waitForAnyKey(): Promise<void> {
  return new Promise(resolve => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', () => {
      process.stdin.setRawMode(false);
      resolve();
    });
  });
}

// 交互式主程序
export async function runInteractive(): Promise<void> {
  showBanner();

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
    spinner.stop();
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
      case 'quit':
        console.log(chalk.gray(`\n${t('goodbye', currentLang)}`));
        return;
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
    await waitForAnyKey();
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
    process.exit(0);
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
      process.exit(0);
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

  console.clear();
  showBanner();

  console.log(chalk.bold(`  📊 ${t('statistics', currentLang)}`));
  console.log();
  console.log(`  ${chalk.gray(t('totalProjects', currentLang) + ':')}       ${chalk.cyan(result.projects.length)}`);
  console.log(`  ${chalk.gray(t('totalConversations', currentLang) + ':')}       ${chalk.cyan(result.totalConversations)}`);
  console.log(`  ${chalk.gray(t('totalSize', currentLang) + ':')}         ${chalk.cyan(formatSize(result.totalSize))}`);
  console.log();

  // Top 10 项目
  console.log(chalk.bold(`  ${t('topProjectsBySize', currentLang)}:`));
  console.log();

  const sorted = [...result.projects].sort((a, b) => b.totalSize - a.totalSize).slice(0, 10);

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const bar = '█'.repeat(Math.ceil((p.totalSize / result.totalSize) * 20));
    console.log(`  ${(i + 1).toString().padStart(2)}. ${p.name.slice(0, 20).padEnd(20)} ${formatSize(p.totalSize).padStart(10)} ${chalk.blue(bar)}`);
  }

  console.log();
  console.log(chalk.gray(`  ${t('pressAnyKeyToReturn', currentLang)}`));

  await waitForAnyKey();
}
