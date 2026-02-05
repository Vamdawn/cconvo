import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { scanProjects, findConversation, AmbiguousSessionIdError } from './core/scanner.js';
import { parseConversation } from './core/parser.js';
import { exportConversation, getFileExtension } from './exporters/index.js';
import { formatDateTime, formatSize, formatTokens } from './utils/format.js';
import { generateCompletion, getInstallInstructions } from './completion.js';
import {
  detectShell,
  getShellRcFile,
  isCompletionInstalled,
  installCompletion,
  uninstallCompletion,
} from './utils/shell.js';
import { APP_NAME, VERSION } from './constants.js';
import { t } from './utils/i18n.js';
import { getLanguage } from './utils/settings.js';
import type { ExportOptions } from './models/types.js';
import type { ShellType } from './completion.js';

const program = new Command();

program
  .name(APP_NAME)
  .description('Interactive CLI tool to browse and export Claude Code conversations')
  .version(VERSION);

// list 命令
program
  .command('list')
  .description('List all projects and conversations')
  .option('-p, --project <name>', 'Filter by project name')
  .action(async (options) => {
    const lang = getLanguage();
    const spinner = ora(t('scanningConversations', lang)).start();

    try {
      const result = await scanProjects();
      spinner.stop();

      if (result.projects.length === 0) {
        console.log(chalk.yellow(t('noConversationsFound', lang)));
        return;
      }

      // 过滤项目
      let projects = result.projects;
      if (options.project) {
        projects = projects.filter(p =>
          p.name.toLowerCase().includes(options.project.toLowerCase()) ||
          p.originalPath.toLowerCase().includes(options.project.toLowerCase())
        );
      }

      if (projects.length === 0) {
        console.log(chalk.yellow(`${t('noProjectsMatching', lang)} "${options.project}"`));
        return;
      }

      // 显示概览
      console.log();
      console.log(chalk.bold(`${t('foundConversations', lang)} ${chalk.cyan(result.totalConversations)} ${t('conversationsIn', lang)} ${chalk.cyan(projects.length)} ${t('projects', lang)}`));
      console.log(chalk.gray(`${t('totalSize', lang)}: ${formatSize(result.totalSize)}`));
      console.log();

      // 显示每个项目
      for (const project of projects) {
        const deletedTag = project.isDeleted ? chalk.red(` [${t('deleted', lang)}]`) : '';
        console.log(chalk.bold.blue(`📁 ${project.name}`) + deletedTag);
        console.log(chalk.gray(`   ${project.originalPath}`));
        console.log(chalk.gray(`   ${project.totalConversations} ${t('conversations', lang)}, ${formatSize(project.totalSize)}`));
        console.log();

        // 显示对话列表
        const table = new Table({
          head: [
            chalk.gray('Session ID'),
            chalk.gray('Slug'),
            chalk.gray('Time'),
            chalk.gray('Messages'),
            chalk.gray('Size'),
          ],
          style: { head: [], border: [] },
          colWidths: [40, 30, 22, 10, 12],
        });

        for (const conv of project.conversations.slice(0, 10)) {
          table.push([
            conv.sessionId.slice(0, 36),
            conv.slug ? conv.slug.slice(0, 28) : '-',
            formatDateTime(conv.startTime).slice(0, 19),
            conv.messageCount.toString(),
            formatSize(conv.fileSize),
          ]);
        }

        console.log(table.toString());

        if (project.conversations.length > 10) {
          console.log(chalk.gray(`   ... ${t('andMore', lang)} ${project.conversations.length - 10} ${t('moreConversations', lang)}`));
        }
        console.log();
      }
    } catch (error) {
      spinner.fail(t('failedToScan', lang));
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  });

// export 命令
program
  .command('export <sessionId>')
  .description('Export a conversation')
  .option('-f, --format <format>', 'Export format (markdown, json, html)', 'markdown')
  .option('-o, --output <path>', 'Output file path')
  .option('-l, --lang <code>', 'Output language (en, zh)', 'en')
  .option('--no-thinking', 'Exclude thinking blocks')
  .option('--no-tools', 'Exclude tool calls')
  .option('--subagents', 'Include subagent conversations')
  .option('--verbose-tools', 'Show full tool call JSON (markdown only)')
  .action(async (sessionId: string, options) => {
    const lang = getLanguage();
    const spinner = ora(t('findingConversation', lang)).start();

    try {
      const found = await findConversation(sessionId);

      if (!found) {
        spinner.fail(`${t('conversationNotFound', lang)}: ${sessionId}`);
        process.exit(1);
      }

      spinner.text = t('parsingConversation', lang);
      const conversation = await parseConversation(
        found.conversation.filePath,
        found.project.originalPath
      );

      spinner.text = t('exporting', lang);

      const outputPath = options.output ||
        `${conversation.slug || conversation.sessionId}${getFileExtension(options.format)}`;

      const exportOptions: ExportOptions = {
        format: options.format,
        includeThinking: options.thinking !== false,
        includeToolCalls: options.tools !== false,
        includeSubagents: options.subagents || false,
        outputPath,
        verboseTools: options.verboseTools || false,
        language: options.lang === 'zh' ? 'zh' : 'en',
      };

      await exportConversation(conversation, exportOptions);
      spinner.succeed(`${t('exportedTo', lang)} ${chalk.green(outputPath)}`);
    } catch (error) {
      if (error instanceof AmbiguousSessionIdError) {
        spinner.fail(
          `${t('ambiguousSessionId', lang)} '${error.prefix}', ${t('matched', lang)} ${error.matches.length} conversations:`
        );
        console.log();

        const table = new Table({
          style: { head: [], border: [] },
          colWidths: [40, 25, 22],
        });

        for (const match of error.matches) {
          table.push([
            match.sessionId.slice(0, 36) + '...',
            match.projectName.slice(0, 23),
            formatDateTime(match.startTime).slice(0, 19),
          ]);
        }

        console.log(table.toString());
        console.log();
        console.log(chalk.yellow(t('useLongerPrefix', lang)));
        process.exit(1);
      }

      spinner.fail(t('exportFailed', lang));
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  });

// stats 命令
program
  .command('stats')
  .description('Show conversation statistics')
  .option('-p, --project <name>', 'Filter by project name')
  .action(async (options) => {
    const lang = getLanguage();
    const spinner = ora(t('calculatingStats', lang)).start();

    try {
      const result = await scanProjects();
      spinner.stop();

      // 过滤项目
      let projects = result.projects;
      if (options.project) {
        projects = projects.filter(p =>
          p.name.toLowerCase().includes(options.project.toLowerCase())
        );
      }

      console.log();
      console.log(chalk.bold(`📊 ${t('statistics', lang)}`));
      console.log();

      // 总体统计
      const totalConversations = projects.reduce((sum, p) => sum + p.totalConversations, 0);
      const totalSize = projects.reduce((sum, p) => sum + p.totalSize, 0);

      console.log(chalk.gray('─'.repeat(50)));
      console.log(`${chalk.bold(t('totalProjects', lang) + ':')}        ${chalk.cyan(projects.length)}`);
      console.log(`${chalk.bold(t('totalConversations', lang) + ':')}   ${chalk.cyan(totalConversations)}`);
      console.log(`${chalk.bold(t('totalSize', lang) + ':')}      ${chalk.cyan(formatSize(totalSize))}`);
      console.log(chalk.gray('─'.repeat(50)));
      console.log();

      // 项目统计表
      const table = new Table({
        head: [
          chalk.gray('Project'),
          chalk.gray('Conversations'),
          chalk.gray('Size'),
        ],
        style: { head: [], border: [] },
        colWidths: [35, 15, 15],
      });

      for (const project of projects.slice(0, 20)) {
        table.push([
          project.name.slice(0, 33),
          project.totalConversations.toString(),
          formatSize(project.totalSize),
        ]);
      }

      console.log(table.toString());

      if (projects.length > 20) {
        console.log(chalk.gray(`\n... ${t('andMore', lang)} ${projects.length - 20} ${t('moreProjects', lang)}`));
      }
    } catch (error) {
      spinner.fail(t('failedToCalculate', lang));
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  });

// completion 命令
program
  .command('completion [shell]')
  .description('Generate shell completion script (bash, zsh, fish)')
  .action((shell?: string) => {
    const validShells = ['bash', 'zsh', 'fish'];

    if (!shell) {
      console.log(chalk.bold('Usage: cconvo completion <shell>'));
      console.log();
      console.log('Generate shell completion scripts for cconvo.');
      console.log();
      console.log(chalk.bold('Supported shells:'));
      console.log('  bash    Bash shell completion');
      console.log('  zsh     Zsh shell completion');
      console.log('  fish    Fish shell completion');
      console.log();
      console.log(chalk.bold('Examples:'));
      console.log(chalk.gray('  # Bash'));
      console.log('  cconvo completion bash >> ~/.bashrc');
      console.log();
      console.log(chalk.gray('  # Zsh'));
      console.log('  cconvo completion zsh > ~/.zsh/completions/_cconvo');
      console.log();
      console.log(chalk.gray('  # Fish'));
      console.log('  cconvo completion fish > ~/.config/fish/completions/cconvo.fish');
      return;
    }

    if (!validShells.includes(shell)) {
      console.error(chalk.red(`Error: Unsupported shell "${shell}"`));
      console.error(`Supported shells: ${validShells.join(', ')}`);
      process.exit(1);
    }

    const completionScript = generateCompletion(shell as ShellType);
    console.log(completionScript);
  });

// completion:setup 命令
program
  .command('completion:setup')
  .description('Install shell completion to your shell configuration')
  .action(async () => {
    const spinner = ora('Setting up shell completion...').start();

    try {
      const shell = detectShell();
      spinner.text = `Detected shell: ${shell}`;

      // 检查是否已安装
      if (isCompletionInstalled(shell)) {
        spinner.succeed(`Shell completion is already installed for ${shell}`);
        return;
      }

      const { rcFile, backupFile } = installCompletion(shell);

      spinner.succeed(chalk.green('Shell completion installed successfully!'));
      console.log();
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`${chalk.bold('Shell:')}     ${shell}`);
      console.log(`${chalk.bold('Config:')}   ${rcFile}`);
      if (backupFile) {
        console.log(`${chalk.bold('Backup:')}   ${backupFile}`);
      }
      console.log(chalk.gray('─'.repeat(50)));
      console.log();
      console.log(chalk.yellow('Please reload your shell configuration:'));
      console.log();
      console.log(`  ${chalk.cyan(`source ${rcFile}`)}`);
      console.log();
      console.log(chalk.gray('Or restart your terminal.'));
    } catch (error) {
      spinner.fail('Failed to setup shell completion');
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  });

// completion:uninstall 命令
program
  .command('completion:uninstall')
  .description('Remove shell completion from your shell configuration')
  .action(async () => {
    const spinner = ora('Removing shell completion...').start();

    try {
      const shell = detectShell();
      const { rcFile, removed } = uninstallCompletion(shell);

      if (!removed) {
        spinner.info('Shell completion was not installed');
        return;
      }

      spinner.succeed(chalk.green('Shell completion removed successfully!'));
      console.log();
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`${chalk.bold('Shell:')}   ${shell}`);
      console.log(`${chalk.bold('Config:')} ${rcFile}`);
      console.log(chalk.gray('─'.repeat(50)));
      console.log();
      console.log(chalk.yellow('Please reload your shell configuration:'));
      console.log();
      console.log(`  ${chalk.cyan(`source ${rcFile}`)}`);
      console.log();
    } catch (error) {
      spinner.fail('Failed to remove shell completion');
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  });

export { program };
