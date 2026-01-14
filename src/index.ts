#!/usr/bin/env node

import { program } from './cli.js';
import { runInteractive } from './interactive.js';

async function main(): Promise<void> {
  // 如果没有子命令，进入交互式模式
  if (process.argv.length <= 2) {
    await runInteractive();
  } else {
    program.parse();
  }
}

main().catch(console.error);
