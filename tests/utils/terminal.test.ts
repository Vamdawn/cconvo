import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// mock process.exit
const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

describe('terminal utils', () => {
  beforeEach(() => {
    vi.resetModules();
    mockExit.mockClear();
  });

  afterEach(() => {
    mockExit.mockClear();
  });

  describe('exitApp', () => {
    it('应调用 process.exit 并传递退出码', async () => {
      const { exitApp } = await import('../../src/utils/terminal.js');
      exitApp(0);
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('应支持自定义退出码', async () => {
      const { exitApp } = await import('../../src/utils/terminal.js');
      exitApp(1);
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('默认退出码为 0', async () => {
      const { exitApp } = await import('../../src/utils/terminal.js');
      exitApp();
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('isCtrlC', () => {
    it('应识别 Ctrl+C 按键', async () => {
      const { isCtrlC } = await import('../../src/utils/terminal.js');
      expect(isCtrlC(undefined, { ctrl: true, name: 'c', sequence: '\x03', shift: false, meta: false })).toBe(true);
    });

    it('应拒绝普通 c 键', async () => {
      const { isCtrlC } = await import('../../src/utils/terminal.js');
      expect(isCtrlC('c', { ctrl: false, name: 'c', sequence: 'c', shift: false, meta: false })).toBe(false);
    });

    it('应识别 \\x03 字符', async () => {
      const { isCtrlC } = await import('../../src/utils/terminal.js');
      expect(isCtrlC('\x03', { ctrl: true, name: 'c', sequence: '\x03', shift: false, meta: false })).toBe(true);
    });
  });
});
