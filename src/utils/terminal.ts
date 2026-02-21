import type readline from 'readline';

// 重置终端状态
function resetTerminal(): void {
  if (process.stdin.isTTY && process.stdin.isRaw) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
}

// 集中式退出函数
export function exitApp(code: number = 0): void {
  resetTerminal();
  process.exit(code);
}

// 等待用户按键，返回按键字符
// 注意：Ctrl+C 在此函数中触发 exitApp()，确保任何等待场景下都能安全退出
export function waitForKeypress(): Promise<string> {
  return new Promise(resolve => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', (data) => {
      process.stdin.setRawMode(false);
      const str = data.toString();
      if (str === '\x03') {
        exitApp(0);
      }
      resolve(str);
    });
  });
}

// 判断是否为 Ctrl+C 按键（用于 keypress 事件处理器中）
export function isCtrlC(_str: string | undefined, key: readline.Key): boolean {
  return key.ctrl === true && key.name === 'c';
}

// 注册全局 SIGINT 处理器（非 raw mode 下生效）
export function registerSigintHandler(): void {
  process.on('SIGINT', () => {
    exitApp(0);
  });
}
