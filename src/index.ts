#!/usr/bin/env node

import { program } from './cli.js';
import { runInteractive } from './interactive.js';
import { registerSigintHandler } from './utils/terminal.js';

async function main(): Promise<void> {
  registerSigintHandler();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // 无参数，进入主界面
    await runInteractive();
  } else if (args.length === 1 && args[0] === '.') {
    // cconvo . → 直接进入当前目录项目
    await runInteractive({ detectProject: true });
  } else {
    program.parse();
  }
}

main().catch(console.error);
