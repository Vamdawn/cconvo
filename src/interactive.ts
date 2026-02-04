import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { scanProjects, findProjectByPath } from './core/scanner.js';
import { parseConversation } from './core/parser.js';
import { exportConversation, getFileExtension } from './exporters/index.js';
import { formatDateTime, formatSize, truncate, extractTextContent } from './utils/format.js';
import type { Project, ConversationSummary, ExportOptions } from './models/types.js';
import { showConversationList } from './components/conversation-list.js';
import { showBanner } from './components/banner.js';

// 导航结果类型
type NavigationResult = 'continue' | 'back' | 'main';

// 主菜单选项
const MAIN_MENU_CHOICES = [
  { name: '📁 Browse Projects', value: 'browse' },
  { name: '🔍 Search Conversations', value: 'search' },
  { name: '📊 View Statistics', value: 'stats' },
  { name: '❌ Exit', value: 'exit' },
];

// 交互式主程序
export async function runInteractive(): Promise<void> {
  showBanner();

  // 检测当前目录是否为已记录的项目
  const cwd = process.cwd();
  const spinner = ora('正在检测当前项目...').start();
  const currentProject = await findProjectByPath(cwd);

  if (currentProject && currentProject.conversations.length > 0) {
    spinner.succeed(`检测到项目: ${currentProject.name} (${currentProject.conversations.length} 个对话)`);
    // 直接进入当前项目的对话列表
    const result = await showConversationList(currentProject);

    if (result.action === 'quit') {
      console.log(chalk.gray('\nGoodbye!'));
      return;
    }

    if (result.action === 'main') {
      // 继续显示主菜单
    } else {
      return;
    }
  } else {
    spinner.stop();
  }

  // 原有主菜单逻辑
  while (true) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: MAIN_MENU_CHOICES,
      },
    ]);

    switch (action) {
      case 'browse':
        await browseProjects();
        break;
      case 'search':
        await searchConversations();
        break;
      case 'stats':
        await showStatistics();
        break;
      case 'exit':
        console.log(chalk.gray('\nGoodbye!'));
        return;
    }
  }
}

// 浏览项目
async function browseProjects(): Promise<NavigationResult> {
  const spinner = ora('Loading projects...').start();
  const result = await scanProjects();
  spinner.stop();

  if (result.projects.length === 0) {
    console.log(chalk.yellow('\nNo projects found.\n'));
    return 'back';
  }

  const choices = result.projects.map(p => ({
    name: p.isDeleted
      ? `${p.name} ${chalk.red('[Deleted]')} (${p.totalConversations} conversations)`
      : `${p.name} (${p.totalConversations} conversations)`,
    value: p,
  }));
  choices.push({ name: chalk.gray('← Back'), value: null as unknown as Project });

  const { project } = await inquirer.prompt([
    {
      type: 'list',
      name: 'project',
      message: 'Select a project:',
      choices,
      pageSize: 15,
    },
  ]);

  if (project) {
    return await browseConversations(project);
  }

  return 'back';
}

// 浏览对话
async function browseConversations(project: Project): Promise<NavigationResult> {
  while (true) {
    const choices: Array<{ name: string; value: ConversationSummary | null | 'main' }> = project.conversations.map(c => ({
      name: `${formatDateTime(c.startTime)} - ${c.slug || c.sessionId.slice(0, 8)} (${c.messageCount} msgs)`,
      value: c,
    }));
    choices.push({ name: chalk.gray('← Back'), value: null });
    choices.push({ name: chalk.cyan('🏠 Main Menu'), value: 'main' });

    console.log();
    const deletedTag = project.isDeleted ? chalk.red(' [Deleted]') : '';
    console.log(chalk.bold.blue(`📁 ${project.name}`) + deletedTag);
    console.log(chalk.gray(`   ${project.originalPath}`));
    console.log();

    const { conversation } = await inquirer.prompt([
      {
        type: 'list',
        name: 'conversation',
        message: 'Select a conversation:',
        choices,
        pageSize: 15,
      },
    ]);

    if (conversation === 'main') {
      return 'main';
    }

    if (!conversation) {
      return 'back';
    }

    const result = await showConversationActions(project, conversation as ConversationSummary);
    if (result === 'main') {
      return 'main';
    }
    // result === 'back' 时继续循环显示对话列表
    // result === 'continue' 时也继续循环（用于查看信息后）
  }
}

// 对话操作菜单
async function showConversationActions(
  project: Project,
  conversationSummary: ConversationSummary
): Promise<NavigationResult> {
  const spinner = ora('Loading conversation...').start();
  const conversation = await parseConversation(
    conversationSummary.filePath,
    project.originalPath
  );
  spinner.stop();

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: `Conversation: ${conversation.slug || conversation.sessionId.slice(0, 8)}`,
      choices: [
        { name: '👁️  Preview', value: 'preview' },
        { name: '📤 Export', value: 'export' },
        { name: '📋 Show Info', value: 'info' },
        { name: chalk.gray('← Back'), value: 'back' },
        { name: chalk.cyan('🏠 Main Menu'), value: 'main' },
      ],
    },
  ]);

  switch (action) {
    case 'preview':
      await previewConversation(conversation);
      return 'back';
    case 'export':
      await exportConversationPrompt(conversation);
      return 'back';
    case 'info':
      showConversationInfo(conversation);
      return 'continue';
    case 'main':
      return 'main';
    case 'back':
    default:
      return 'back';
  }
}

// 预览对话
async function previewConversation(conversation: { messages: Array<{ type: string }>, slug?: string, sessionId: string }): Promise<void> {
  const messages = conversation.messages.filter(
    m => m.type === 'user' || m.type === 'assistant'
  );

  console.log();
  console.log(chalk.bold('─'.repeat(60)));
  console.log(chalk.bold(`Preview: ${conversation.slug || conversation.sessionId.slice(0, 8)}`));
  console.log(chalk.bold('─'.repeat(60)));
  console.log();

  // 显示前10条消息
  const previewCount = Math.min(10, messages.length);
  for (let i = 0; i < previewCount; i++) {
    const msg = messages[i];
    const role = msg.type === 'user' ? chalk.blue('User') : chalk.green('Assistant');
    const content = truncate(extractTextContent(msg as Parameters<typeof extractTextContent>[0]), 200);

    console.log(`${role}:`);
    console.log(chalk.gray(content));
    console.log();
  }

  if (messages.length > previewCount) {
    console.log(chalk.gray(`... and ${messages.length - previewCount} more messages`));
  }

  console.log(chalk.bold('─'.repeat(60)));
  console.log();

  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: 'Press Enter to continue...',
    },
  ]);
}

// 导出对话提示
async function exportConversationPrompt(conversation: Parameters<typeof exportConversation>[0]): Promise<void> {
  const { format } = await inquirer.prompt([
    {
      type: 'list',
      name: 'format',
      message: 'Select export format:',
      choices: [
        { name: 'Markdown (.md)', value: 'markdown' },
        { name: 'JSON (.json)', value: 'json' },
        { name: 'HTML (.html)', value: 'html' },
      ],
    },
  ]);

  const { options } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'options',
      message: 'Export options:',
      choices: [
        { name: 'Include thinking blocks', value: 'thinking', checked: true },
        { name: 'Include tool calls', value: 'tools', checked: true },
        { name: 'Include subagent conversations', value: 'subagents', checked: false },
        ...(format === 'markdown' ? [{ name: 'Show full tool call JSON', value: 'verboseTools', checked: false }] : []),
      ],
    },
  ]);

  // 语言选择（仅 markdown 格式）
  let language: 'en' | 'zh' = 'en';
  if (format === 'markdown') {
    const { lang } = await inquirer.prompt([
      {
        type: 'list',
        name: 'lang',
        message: 'Output language:',
        choices: [
          { name: 'English', value: 'en' },
          { name: '中文', value: 'zh' },
        ],
        default: 'en',
      },
    ]);
    language = lang;
  }

  const defaultName = `${conversation.slug || conversation.sessionId}${getFileExtension(format)}`;
  const { outputPath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'outputPath',
      message: 'Output file path:',
      default: defaultName,
    },
  ]);

  const spinner = ora('Exporting...').start();

  try {
    const exportOptions: ExportOptions = {
      format,
      includeThinking: options.includes('thinking'),
      includeToolCalls: options.includes('tools'),
      includeSubagents: options.includes('subagents'),
      outputPath,
      verboseTools: options.includes('verboseTools'),
      language,
    };

    await exportConversation(conversation, exportOptions);
    spinner.succeed(`Exported to ${chalk.green(outputPath)}`);
  } catch (error) {
    spinner.fail('Export failed');
    console.error(chalk.red((error as Error).message));
  }

  console.log();
}

// 显示对话信息
function showConversationInfo(conversation: {
  slug?: string;
  sessionId: string;
  projectPath: string;
  startTime: Date;
  endTime: Date;
  messageCount: number;
  totalTokens: { input_tokens: number; output_tokens: number };
  subagents: Array<{ agentId: string; messageCount: number }>;
}): void {
  console.log();
  console.log(chalk.bold('─'.repeat(60)));
  console.log(chalk.bold('Conversation Info'));
  console.log(chalk.bold('─'.repeat(60)));
  console.log();
  console.log(`${chalk.gray('Slug:')}       ${conversation.slug || '-'}`);
  console.log(`${chalk.gray('Session:')}    ${conversation.sessionId}`);
  console.log(`${chalk.gray('Project:')}    ${conversation.projectPath}`);
  console.log(`${chalk.gray('Start:')}      ${formatDateTime(conversation.startTime)}`);
  console.log(`${chalk.gray('End:')}        ${formatDateTime(conversation.endTime)}`);
  console.log(`${chalk.gray('Messages:')}   ${conversation.messageCount}`);
  console.log(`${chalk.gray('Tokens:')}     In: ${conversation.totalTokens.input_tokens} / Out: ${conversation.totalTokens.output_tokens}`);
  console.log(`${chalk.gray('Subagents:')}  ${conversation.subagents.length}`);

  if (conversation.subagents.length > 0) {
    console.log();
    console.log(chalk.gray('Subagent details:'));
    for (const sub of conversation.subagents) {
      console.log(`  - ${sub.agentId}: ${sub.messageCount} messages`);
    }
  }

  console.log();
  console.log(chalk.bold('─'.repeat(60)));
  console.log();
}

// 搜索对话
async function searchConversations(): Promise<NavigationResult> {
  const { keyword } = await inquirer.prompt([
    {
      type: 'input',
      name: 'keyword',
      message: 'Enter search keyword (project name or session ID):',
    },
  ]);

  if (!keyword.trim()) {
    return 'back';
  }

  const spinner = ora('Searching...').start();
  const result = await scanProjects();
  spinner.stop();

  // 搜索匹配的对话
  const matches: Array<{ project: Project; conversation: ConversationSummary }> = [];

  for (const project of result.projects) {
    if (project.name.toLowerCase().includes(keyword.toLowerCase()) ||
        project.originalPath.toLowerCase().includes(keyword.toLowerCase())) {
      for (const conv of project.conversations) {
        matches.push({ project, conversation: conv });
      }
    } else {
      for (const conv of project.conversations) {
        if (conv.sessionId.includes(keyword) ||
            (conv.slug && conv.slug.toLowerCase().includes(keyword.toLowerCase()))) {
          matches.push({ project, conversation: conv });
        }
      }
    }
  }

  if (matches.length === 0) {
    console.log(chalk.yellow(`\nNo conversations found matching "${keyword}"\n`));
    return 'back';
  }

  while (true) {
    console.log(chalk.green(`\nFound ${matches.length} matches:\n`));

    const choices: Array<{ name: string; value: { project: Project; conversation: ConversationSummary } | null | 'main' }> = matches.slice(0, 30).map(m => ({
      name: `[${m.project.name}] ${formatDateTime(m.conversation.startTime)} - ${m.conversation.slug || m.conversation.sessionId.slice(0, 8)}`,
      value: m,
    }));
    choices.push({ name: chalk.gray('← Back'), value: null });
    choices.push({ name: chalk.cyan('🏠 Main Menu'), value: 'main' });

    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: 'Select a conversation:',
        choices,
        pageSize: 15,
      },
    ]);

    if (selected === 'main') {
      return 'main';
    }

    if (!selected) {
      return 'back';
    }

    const result = await showConversationActions(selected.project, selected.conversation);
    if (result === 'main') {
      return 'main';
    }
    // result === 'back' 或 'continue' 时继续循环显示搜索结果
  }
}

// 显示统计
async function showStatistics(): Promise<void> {
  const spinner = ora('Calculating statistics...').start();
  const result = await scanProjects();
  spinner.stop();

  console.log();
  console.log(chalk.bold('─'.repeat(60)));
  console.log(chalk.bold('📊 Statistics'));
  console.log(chalk.bold('─'.repeat(60)));
  console.log();
  console.log(`${chalk.gray('Total Projects:')}       ${chalk.cyan(result.projects.length)}`);
  console.log(`${chalk.gray('Total Conversations:')}  ${chalk.cyan(result.totalConversations)}`);
  console.log(`${chalk.gray('Total Size:')}           ${chalk.cyan(formatSize(result.totalSize))}`);
  console.log();

  // Top 10 项目
  console.log(chalk.bold('Top 10 Projects by Size:'));
  console.log();

  const sorted = [...result.projects].sort((a, b) => b.totalSize - a.totalSize).slice(0, 10);

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const bar = '█'.repeat(Math.ceil((p.totalSize / result.totalSize) * 30));
    console.log(`  ${(i + 1).toString().padStart(2)}. ${p.name.slice(0, 25).padEnd(25)} ${formatSize(p.totalSize).padStart(10)} ${chalk.blue(bar)}`);
  }

  console.log();
  console.log(chalk.bold('─'.repeat(60)));
  console.log();

  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: 'Press Enter to continue...',
    },
  ]);
}
