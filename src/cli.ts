import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { scanProjects, findConversation } from './core/scanner.js';
import { parseConversation } from './core/parser.js';
import { exportConversation, getFileExtension } from './exporters/index.js';
import { formatDateTime, formatSize, formatTokens } from './utils/format.js';
import { generateCompletion, getInstallInstructions } from './completion.js';
import type { ExportOptions } from './models/types.js';
import type { ShellType } from './completion.js';

const program = new Command();

program
  .name('cconvo')
  .description('Interactive CLI tool to browse and export Claude Code conversations')
  .version('1.0.0');

// list 命令
program
  .command('list')
  .description('List all projects and conversations')
  .option('-p, --project <name>', 'Filter by project name')
  .action(async (options) => {
    const spinner = ora('Scanning conversations...').start();

    try {
      const result = await scanProjects();
      spinner.stop();

      if (result.projects.length === 0) {
        console.log(chalk.yellow('No conversations found.'));
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
        console.log(chalk.yellow(`No projects matching "${options.project}"`));
        return;
      }

      // 显示概览
      console.log();
      console.log(chalk.bold(`Found ${chalk.cyan(result.totalConversations)} conversations in ${chalk.cyan(projects.length)} projects`));
      console.log(chalk.gray(`Total size: ${formatSize(result.totalSize)}`));
      console.log();

      // 显示每个项目
      for (const project of projects) {
        console.log(chalk.bold.blue(`📁 ${project.name}`));
        console.log(chalk.gray(`   ${project.originalPath}`));
        console.log(chalk.gray(`   ${project.totalConversations} conversations, ${formatSize(project.totalSize)}`));
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
          console.log(chalk.gray(`   ... and ${project.conversations.length - 10} more conversations`));
        }
        console.log();
      }
    } catch (error) {
      spinner.fail('Failed to scan conversations');
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
  .option('--no-thinking', 'Exclude thinking blocks')
  .option('--no-tools', 'Exclude tool calls')
  .option('--subagents', 'Include subagent conversations')
  .action(async (sessionId: string, options) => {
    const spinner = ora('Finding conversation...').start();

    try {
      const found = await findConversation(sessionId);

      if (!found) {
        spinner.fail(`Conversation not found: ${sessionId}`);
        process.exit(1);
      }

      spinner.text = 'Parsing conversation...';
      const conversation = await parseConversation(
        found.conversation.filePath,
        found.project.originalPath
      );

      spinner.text = 'Exporting...';

      const outputPath = options.output ||
        `${conversation.slug || conversation.sessionId}${getFileExtension(options.format)}`;

      const exportOptions: ExportOptions = {
        format: options.format,
        includeThinking: options.thinking !== false,
        includeToolCalls: options.tools !== false,
        includeSubagents: options.subagents || false,
        outputPath,
      };

      await exportConversation(conversation, exportOptions);
      spinner.succeed(`Exported to ${chalk.green(outputPath)}`);
    } catch (error) {
      spinner.fail('Export failed');
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
    const spinner = ora('Calculating statistics...').start();

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
      console.log(chalk.bold('📊 Statistics'));
      console.log();

      // 总体统计
      const totalConversations = projects.reduce((sum, p) => sum + p.totalConversations, 0);
      const totalSize = projects.reduce((sum, p) => sum + p.totalSize, 0);

      console.log(chalk.gray('─'.repeat(50)));
      console.log(`${chalk.bold('Projects:')}        ${chalk.cyan(projects.length)}`);
      console.log(`${chalk.bold('Conversations:')}   ${chalk.cyan(totalConversations)}`);
      console.log(`${chalk.bold('Total Size:')}      ${chalk.cyan(formatSize(totalSize))}`);
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
        console.log(chalk.gray(`\n... and ${projects.length - 20} more projects`));
      }
    } catch (error) {
      spinner.fail('Failed to calculate statistics');
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

export { program };
