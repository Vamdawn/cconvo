import type readline from 'readline';

// TUI 模式状态标志
let inTUI = false;

// 重置终端状态
function resetTerminal(): void {
  if (process.stdin.isTTY && process.stdin.isRaw) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
}

// 集中式退出函数
export function exitApp(code: number = 0): void {
  exitTUI();       // 先恢复原始屏幕
  resetTerminal(); // 再重置终端状态
  process.exit(code);
}

// 等待用户按键，返回按键字符
// 注意：Ctrl+C 在此函数中触发 exitApp()，确保任何等待场景下都能安全退出
// exitApp() 内部调用 exitTUI()，inTUI 标志保证非 TUI 上下文中调用也是安全的（no-op）
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

// 进入 TUI 模式（切换到备用屏幕缓冲区）
// 包含 TTY 检测：非 TTY 环境（管道、CI）下为 no-op，避免输出 ANSI 垃圾
export function enterTUI(): void {
  if (!process.stdout.isTTY) return;
  inTUI = true;
  process.stdout.write('\x1b[?1049h'); // 切换备用屏幕
  process.stdout.write('\x1b[H');      // 光标归位
}

// 退出 TUI 模式（恢复原始屏幕缓冲区）
export function exitTUI(): void {
  if (inTUI) {
    inTUI = false;
    process.stdout.write('\x1b[?1049l'); // 恢复原始屏幕
  }
}

// 清屏（在备用屏幕中使用，不污染滚动历史）
export function clearScreen(): void {
  if (!process.stdout.isTTY) return;
  process.stdout.write('\x1b[2J\x1b[H'); // 擦除整屏 + 光标归位
}
