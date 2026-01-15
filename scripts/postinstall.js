#!/usr/bin/env node

// postinstall 脚本 - 在全局安装后显示友好提示

// 仅在全局安装时运行
const isGlobal = process.env.npm_config_global === 'true';

// 仅在交互式终端时显示提示
const isTTY = process.stdout.isTTY;

if (isGlobal && isTTY) {
  console.log('');
  console.log('━'.repeat(50));
  console.log('  cconvo installed successfully!');
  console.log('');
  console.log('  Enable shell completion:');
  console.log('    cconvo completion:setup');
  console.log('━'.repeat(50));
  console.log('');
}
